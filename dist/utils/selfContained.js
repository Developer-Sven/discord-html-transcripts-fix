"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inlineExternalAssets = inlineExternalAssets;
exports.clearInlineAssetCache = clearInlineAssetCache;
const undici_1 = require("undici");
const utils_1 = require("./utils");
const debug_1 = __importDefault(require("debug"));

const log = (0, debug_1.default)('discord-html-transcripts:selfContained');

const JSDELIVR = 'https://cdn.jsdelivr.net';
// Every specifier inside the jsDelivr "+esm" graph is an absolute /npm/… path,
// which is what makes the blob rewrite below safe. Matching the quoted path
// directly rather than trying to parse import/export syntax is deliberate: a
// syntax-shaped pattern silently skipped side-effect imports (`import"/npm/x";`)
// because its optional `from` group ran ahead to the next `from` in the file.
const SPECIFIER = /["'](\/npm\/[^"']+)["']/g;
// Anything the blob rewrite could not resolve on its own.
const RELATIVE_SPECIFIER = /(?:from|import)\s*\(?\s*["']\.{1,2}\//;
const TWEMOJI_URL = /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/twemoji\/[0-9.]+\/svg\/[0-9a-f-]+\.svg/g;

// Module graphs and emoji SVGs are identical for every transcript in a process,
// so they are fetched once and reused. Keyed by URL.
const graphCache = new Map();
const emojiCache = new Map();

function clearInlineAssetCache() {
    graphCache.clear();
    emojiCache.clear();
}

async function fetchText(url, timeoutMs) {
    const res = await (0, undici_1.request)(url, { headersTimeout: timeoutMs, bodyTimeout: timeoutMs });
    if (res.statusCode !== 200) {
        await res.body.dump();
        throw new Error(`GET ${url} → HTTP ${res.statusCode}`);
    }
    return await res.body.text();
}

// Walks the module graph breadth-first and returns the sources plus a
// dependency-first ordering, so each module can be rewritten once all of its
// dependencies already have a blob URL.
async function fetchModuleGraph(entry, timeoutMs) {
    const cached = graphCache.get(entry);
    if (cached) return cached;

    const sources = new Map();
    const deps = new Map();
    const queue = [entry];

    while (queue.length) {
        const spec = queue.shift();
        if (sources.has(spec)) continue;
        const src = await fetchText(JSDELIVR + spec, timeoutMs);
        if (RELATIVE_SPECIFIER.test(src)) {
            // A relative specifier would resolve against the blob URL at runtime,
            // which cannot work — bail out rather than ship a broken page.
            throw new Error(`relative import in ${spec}`);
        }
        sources.set(spec, src);
        const own = [];
        for (const m of src.matchAll(SPECIFIER)) {
            own.push(m[1]);
            if (!sources.has(m[1])) queue.push(m[1]);
        }
        deps.set(spec, own);
    }

    const order = [];
    const state = new Map();
    const visit = (node) => {
        const s = state.get(node);
        if (s === 'done') return;
        if (s === 'open') throw new Error(`import cycle at ${node}`);
        state.set(node, 'open');
        for (const d of deps.get(node) || []) visit(d);
        state.set(node, 'done');
        order.push(node);
    };
    visit(entry);

    // Dry-run of the browser-side rewrite. If any /npm/… specifier would survive
    // it, the page would fail at runtime with an unresolvable module — better to
    // find that here and keep the CDN reference instead.
    const built = new Set();
    for (const spec of order) {
        let src = sources.get(spec);
        for (const dep of built) src = src.split(`"${dep}"`).join('""').split(`'${dep}'`).join("''");
        const leftover = src.match(SPECIFIER);
        if (leftover) throw new Error(`unresolved specifier ${leftover[0]} in ${spec}`);
        built.add(spec);
    }

    const graph = { entry, order, sources: Object.fromEntries(sources) };
    log('fetched %d modules for %s', order.length, entry);
    graphCache.set(entry, graph);
    return graph;
}

// Rebuilds the module graph in the browser: each module's /npm/… specifiers are
// swapped for the blob URL of the dependency built just before it, so no import
// map and no network access are involved.
function buildBootstrap(graph) {
    const payload = (0, utils_1.safeJsonForScript)({ entry: graph.entry, order: graph.order, sources: graph.sources });
    return `(function(){try{var G=${payload};var urls={};` +
        `G.order.forEach(function(spec){var src=G.sources[spec];` +
        `Object.keys(urls).forEach(function(dep){` +
        `src=src.split('"'+dep+'"').join('"'+urls[dep]+'"').split("'"+dep+"'").join("'"+urls[dep]+"'");});` +
        `urls[spec]=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));});` +
        `import(urls[G.entry]).catch(function(e){console.error('[discord-html-transcripts-fix] inlined component runtime failed to start:',e);});` +
        `}catch(e){console.error('[discord-html-transcripts-fix] inlined component runtime is malformed:',e);}})();`;
}

async function inlineTwemoji(html, timeoutMs) {
    const urls = [...new Set(html.match(TWEMOJI_URL) || [])];
    if (urls.length === 0) return html;

    let out = html;
    let inlined = 0;
    for (const url of urls) {
        let dataUri = emojiCache.get(url);
        if (dataUri === undefined) {
            try {
                const svg = await fetchText(url, timeoutMs);
                dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
            }
            catch (err) {
                // A missing emoji must not fail the export — the original URL stays,
                // so that single image falls back to the CDN.
                log('twemoji %s failed: %s', url, err && err.message ? err.message : err);
                dataUri = null;
            }
            emojiCache.set(url, dataUri);
        }
        if (dataUri) {
            out = out.split(url).join(dataUri);
            inlined++;
        }
    }
    log('inlined %d/%d emoji', inlined, urls.length);
    return out;
}

/**
 * Replaces the third-party CDN references in a rendered transcript with inline
 * copies, so the file renders without jsDelivr or cdnjs.
 *
 * Discord's own CDN (avatars, attachments) is deliberately left alone — that is
 * what `saveImages` covers.
 *
 * Never throws: if anything cannot be fetched the original markup is returned
 * unchanged, which still renders correctly as long as the CDNs are reachable.
 */
async function inlineExternalAssets(html, options) {
    const opts = options || {};
    const timeoutMs = typeof opts.timeout === 'number' ? opts.timeout : 30000;
    let out = html;

    const scriptTag = out.match(/<script[^>]*type="module"[^>]*src="https:\/\/cdn\.jsdelivr\.net(\/npm\/[^"]+)"[^>]*><\/script>/);
    if (scriptTag) {
        try {
            const graph = await fetchModuleGraph(scriptTag[1], timeoutMs);
            const tag = `<script>${buildBootstrap(graph)}</script>`;
            // Replacement MUST be a function: minified module sources contain `$'`
            // and `$&`, which String.replace would expand as match references and
            // splice half the document into the middle of the script.
            out = out.replace(scriptTag[0], () => tag);
        }
        catch (err) {
            console.warn('[discord-html-transcripts-fix] inlineAssets: could not inline the component runtime, ' +
                'keeping the CDN reference — ' + (err && err.message ? err.message : err));
        }
    }

    try {
        out = await inlineTwemoji(out, timeoutMs);
    }
    catch (err) {
        console.warn('[discord-html-transcripts-fix] inlineAssets: could not inline emoji, keeping CDN references — ' +
            (err && err.message ? err.message : err));
    }

    // The preconnect hints only make sense while the CDNs are still referenced.
    if (!out.includes('cdn.jsdelivr.net/npm/')) {
        out = out.replace(/<link[^>]*rel="preconnect"[^>]*href="https:\/\/cdn\.jsdelivr\.net\/"[^>]*\/?>/g, '');
    }

    return out;
}

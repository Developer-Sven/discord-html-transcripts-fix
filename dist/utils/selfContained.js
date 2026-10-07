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

const TWEMOJI = String.raw`https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/twemoji\/[0-9.]+\/svg\/[0-9a-f-]+\.svg`;
// Only attribute values the renderer itself emits: <img src> for emoji in text
// and embeds, and emoji="" on reactions, buttons and selects. Message text, the
// data-text search index and user-posted links are never rewritten — a transcript
// is an archive of what people actually wrote.
// `[^<>]*` rather than `[^>]*` inside tags: identical on real output, where React
// escapes every `<`, but it keeps a malformed document from backtracking for minutes.
const TWEMOJI_ATTRIBUTE = new RegExp(String.raw`(<img\b[^<>]*?\ssrc="|\semoji=")(` + TWEMOJI + ')(")', 'g');
// React emits a preload hint per <img>. Once the image is inline, keeping it would
// only make the page reach cdnjs again.
const TWEMOJI_PRELOAD = new RegExp(String.raw`<link\b[^<>]*\brel="preload"[^<>]*\bhref="(` + TWEMOJI + String.raw`)"[^<>]*\/?>`, 'g');
const TWEMOJI_HOST = 'https://cdnjs.cloudflare.com';
// The gg sans @font-face rules live in a <style> element the generator writes
// itself. Only url() values inside <style> elements are touched: React escapes
// every piece of user text, so no user can produce a raw <style> element, while
// the same URL typed into a message would otherwise be rewritten too.
const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style>/g;
const FONT_SRC = new RegExp(String.raw`url\((https:\/\/cdn\.jsdelivr\.net\/gh\/Tyrrrz\/DiscordFonts@[\w.-]+\/[\w-]+\.woff2)\)`, 'g');

const DEFAULT_TIMEOUT_MS = 30000;
// setTimeout clamps anything above this to 1 ms, which would abort every request.
const MAX_TIMEOUT_MS = 2147483647;
// A failed download is remembered this long. A CDN outage then costs one timeout
// per window instead of one per transcript, without pinning a single transient
// failure for the whole lifetime of a long-running bot.
const FAILURE_TTL_MS = 60000;
const FETCH_CONCURRENCY = 6;
// The real runtime is about 36 modules. A graph far beyond that is not the
// component library any more, and walking it would just burn requests.
const MAX_MODULES = 200;
// Failure entries are keyed by URL and only pruned on lookup; this bounds them for
// bots that live for months.
const MAX_FAILURE_ENTRIES = 1000;

// Module graphs, fonts and emoji SVGs are identical for every transcript in a
// process, so successful downloads are kept for good. Failures are kept only for
// FAILURE_TTL_MS, so the first transcript after an outage retries.
const graphCache = new Map();
// Concurrent exports share one in-flight graph download instead of each walking
// all 36 modules at once.
const graphInFlight = new Map();
// Same for single fonts and emoji, keyed by URL.
const fileInFlight = new Map();
const fontCache = new Map();
const emojiCache = new Map();
const failures = new Map();
const failureReasons = new Map();
const warnedUnavailable = new Set();
let warnedBadTimeout = false;

function clearInlineAssetCache() {
    graphCache.clear();
    graphInFlight.clear();
    fileInFlight.clear();
    fontCache.clear();
    emojiCache.clear();
    failures.clear();
    failureReasons.clear();
    warnedUnavailable.clear();
    warnedBadTimeout = false;
}

// Environment variables arrive as strings, so "5000" is taken as 5000 ms. Anything else
// that is not a usable duration falls back to the default — 0 used to mean "no timeout"
// to undici and hung the export, negative, NaN and Infinity threw — and says so once.
function resolveTimeout(value) {
    if (value === undefined || value === null) return DEFAULT_TIMEOUT_MS;
    const n = typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : value;
    if (Number.isInteger(n) && n > 0 && n <= MAX_TIMEOUT_MS) return n;
    if (!warnedBadTimeout) {
        warnedBadTimeout = true;
        console.warn(`[discord-html-transcripts-fix] inlineAssetsTimeout must be a positive whole number of milliseconds ` +
            `up to ${MAX_TIMEOUT_MS} (got ${typeof value === 'string' ? JSON.stringify(value) : String(value)}); using ${DEFAULT_TIMEOUT_MS}.`);
    }
    return DEFAULT_TIMEOUT_MS;
}

function recentlyFailed(key) {
    const at = failures.get(key);
    if (at === undefined) return false;
    const age = Date.now() - at;
    // A negative age means the clock was set back; treat the entry as expired
    // rather than pinning the host until the clock catches up again.
    if (age >= 0 && age < FAILURE_TTL_MS) return true;
    failures.delete(key);
    return false;
}

// Joins a download of the same URL that another export already started.
function sharedDownload(url, load) {
    let pending = fileInFlight.get(url);
    if (!pending) {
        pending = load().finally(() => fileInFlight.delete(url));
        fileInFlight.set(url, pending);
    }
    return pending;
}

function markFailed(key) {
    if (failures.size >= MAX_FAILURE_ENTRIES) {
        const now = Date.now();
        for (const [k, at] of failures) {
            const age = now - at;
            if (age < 0 || age >= FAILURE_TTL_MS) failures.delete(k);
        }
        // Still full of live entries: drop the oldest (Map keeps insertion order).
        while (failures.size >= MAX_FAILURE_ENTRIES) failures.delete(failures.keys().next().value);
    }
    failures.delete(key); // re-insert so the entry counts as newest
    failures.set(key, Date.now());
}

// Everything this module treats as "the remote side is the problem" is an AssetFetchError.
// Anything else thrown in here is a bug in this module and must never be mistaken for a CDN problem.
class AssetFetchError extends Error {
    constructor(message, { cause, statusCode, outage = false, unavailable = false } = {}) {
        super(message, { cause });
        this.name = 'AssetFetchError';
        this.statusCode = statusCode;
        this.outage = outage;           // the host as a whole looks unusable: stop asking for more files
        this.unavailable = unavailable; // this one file does not exist (404/410)
    }
}

// Nothing answered, or the answer never finished. A single reset socket is NOT in this list:
// it concerns one request and must not blacklist the host for a minute.
const HARD_NETWORK_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH',
    'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);
function transportIsOutage(cause) {
    const code = cause && (cause.code || (cause.cause && cause.cause.code));
    return HARD_NETWORK_CODES.has(code) || (cause && cause.name === 'TimeoutError');
}

function isOutage(err) {
    return err instanceof AssetFetchError && err.outage === true;
}

function describeError(err) {
    return err && err.message ? err.message : String(err);
}

// Network problems are expected and tolerated; anything else is a bug in this file. Both keep the export
// alive (the documented contract), but a bug is reported loudly, with its stack, instead of as "CDN down".
function reportFailure(what, err) {
    if (err instanceof AssetFetchError) {
        console.warn(`[discord-html-transcripts-fix] inlineAssets: ${what} — ${err.message}`);
    }
    else {
        console.error(`[discord-html-transcripts-fix] inlineAssets: INTERNAL ERROR while inlining ${what}; the CDN references ` +
            'are kept and the export continues. This is a bug in discord-html-transcripts-fix, please report it.', err);
    }
}

// A rejecting callback stops new work from being scheduled, lets the in-flight items finish (no orphaned
// requests that outlive the caller) and is rethrown afterwards.
async function mapWithConcurrency(items, limit, fn) {
    let next = 0;
    let failed = null;
    const worker = async () => {
        while (next < items.length && !failed) {
            const i = next++;
            try {
                await fn(items[i], i);
            }
            catch (err) {
                failed = failed || { err };
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    if (failed) throw failed.err;
}

const MAX_ASSET_BYTES = 4 * 1024 * 1024;
// A captive portal, WAF page or proxy error that answers 200 with HTML/JSON is not the asset.
// The component runtime must be a script, not markup.
const LOOKS_LIKE_MODULE = /^\s*[^<\s]/;
const NOT_AN_ASSET = /text\/html|application\/json/i;

// undici applies an AbortSignal only once the request is bound to a socket, so a black-holed connect would
// outlast the requested timeout (verified: timeout 1500 ms -> 10.6 s). The deadline makes the *caller* stop
// waiting on time; the signal still tears the request down as soon as it gets a socket.
function withDeadline(promise, ms) {
    let timer;
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error(`timed out after ${ms} ms`), { name: 'TimeoutError' })), ms);
    });
    promise.catch(() => {}); // the loser of the race must not surface as an unhandled rejection
    return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

async function fetchBody(url, timeoutMs) {
    const signal = AbortSignal.timeout(timeoutMs); // a bad timeout value is a bug, not a network problem
    let res;
    try {
        res = await withDeadline((0, undici_1.request)(url, {
            headersTimeout: timeoutMs,
            bodyTimeout: timeoutMs,
            signal,
        }), timeoutMs);
    }
    catch (cause) {
        throw new AssetFetchError(`GET ${url} failed: ${describeError(cause)}`, { cause, outage: transportIsOutage(cause) });
    }
    if (res.statusCode !== 200) {
        await res.body.dump();
        throw new AssetFetchError(`GET ${url} → HTTP ${res.statusCode}`, {
            statusCode: res.statusCode,
            outage: res.statusCode >= 500 || res.statusCode === 429,
            unavailable: res.statusCode === 404 || res.statusCode === 410,
        });
    }
    const type = String(res.headers['content-type'] || '');
    if (NOT_AN_ASSET.test(type)) {
        await res.body.dump();
        throw new AssetFetchError(`GET ${url} answered with "${type}" instead of the asset`);
    }
    return res.body;
}

async function readBody(url, body, method) {
    let out;
    try {
        out = await body[method]();
    }
    catch (cause) {
        throw new AssetFetchError(`GET ${url} failed while reading the body: ${describeError(cause)}`, { cause, outage: transportIsOutage(cause) });
    }
    if ((out.length || out.byteLength) > MAX_ASSET_BYTES) throw new AssetFetchError(`GET ${url} is larger than ${MAX_ASSET_BYTES} bytes`);
    return out;
}

async function fetchText(url, timeoutMs, mustMatch) {
    const text = await readBody(url, await fetchBody(url, timeoutMs), 'text');
    if (mustMatch && !mustMatch.test(text.slice(0, 512))) throw new AssetFetchError(`GET ${url} does not look like the expected asset`);
    return text;
}

async function fetchBytes(url, timeoutMs, magic) {
    const bytes = Buffer.from(await readBody(url, await fetchBody(url, timeoutMs), 'arrayBuffer'));
    if (magic && bytes.subarray(0, magic.length).toString('latin1') !== magic) throw new AssetFetchError(`GET ${url} does not look like the expected asset`);
    return bytes;
}

async function fetchModuleGraph(entry, timeoutMs) {
    const cached = graphCache.get(entry);
    if (cached) return cached;
    const pending = graphInFlight.get(entry);
    if (pending) return pending;
    if (recentlyFailed(entry) || recentlyFailed(JSDELIVR)) {
        throw new AssetFetchError(`${entry}: an attempt failed less than ${FAILURE_TTL_MS / 1000}s ago (${failureReasons.get(entry) || failureReasons.get(JSDELIVR) || 'see the earlier warning'})`);
    }
    const attempt = (async () => {
        try {
            return await loadModuleGraph(entry, timeoutMs);
        }
        catch (err) {
            if (err instanceof AssetFetchError) {
                markFailed(entry);
                failureReasons.set(entry, describeError(err));
                // The fonts come from the same host; no point in waiting for them too.
                if (isOutage(err)) {
                    markFailed(JSDELIVR);
                    failureReasons.set(JSDELIVR, describeError(err));
                }
            }
            throw err;
        }
        finally {
            graphInFlight.delete(entry);
        }
    })();
    graphInFlight.set(entry, attempt);
    return attempt;
}

// Walks the module graph breadth-first and returns the sources plus a
// dependency-first ordering, so each module can be rewritten once all of its
// dependencies already have a blob URL.
async function loadModuleGraph(entry, timeoutMs) {
    const sources = new Map();
    const deps = new Map();
    const queue = [entry];

    while (queue.length) {
        const spec = queue.shift();
        if (sources.has(spec)) continue;
        if (sources.size >= MAX_MODULES) throw new AssetFetchError(`the runtime graph exceeds ${MAX_MODULES} modules`);
        const src = await fetchText(JSDELIVR + spec, timeoutMs, LOOKS_LIKE_MODULE);
        if (RELATIVE_SPECIFIER.test(src)) {
            // A relative specifier would resolve against the blob URL at runtime,
            // which cannot work — bail out rather than ship a broken page.
            throw new AssetFetchError(`relative import in ${spec}`);
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
        if (s === 'open') throw new AssetFetchError(`import cycle at ${node}`);
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
        if (leftover) throw new AssetFetchError(`unresolved specifier ${leftover[0]} in ${spec}`);
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

// Returns the rewritten markup plus how many font files still point at the CDN,
// which decides whether the preconnect hint may go.
async function inlineFonts(html, timeoutMs) {
    const urls = [...new Set((html.match(STYLE_BLOCK) || []).flatMap((block) => [...block.matchAll(FONT_SRC)].map((m) => m[1])))];
    if (urls.length === 0) return { html, remaining: 0 };

    let outage = recentlyFailed(JSDELIVR);
    const causes = [];
    await mapWithConcurrency(urls, FETCH_CONCURRENCY, async (url) => {
        if (outage || fontCache.has(url) || recentlyFailed(url)) return;
        try {
            const bytes = await sharedDownload(url, () => fetchBytes(url, timeoutMs, 'wOF2'));
            fontCache.set(url, 'data:font/woff2;base64,' + bytes.toString('base64'));
        }
        catch (err) {
            if (!(err instanceof AssetFetchError)) throw err; // a bug: do not mask it, do not blame the host
            markFailed(url);
            causes.push(describeError(err));
            if (isOutage(err)) {
                outage = true;
                markFailed(JSDELIVR);
            }
            log('font %s failed: %s', url, describeError(err));
        }
    });

    const remaining = urls.filter((url) => !fontCache.has(url)).length;
    if (remaining > 0) {
        // The page still renders — the stack falls back to a system font — but the
        // caller asked for a self-contained file, so say that it is not one, and why.
        const why = causes[0] || (outage ? 'jsDelivr was marked unreachable by an earlier failure' : 'unknown');
        console.warn(`[discord-html-transcripts-fix] inlineAssets: ${remaining} of ${urls.length} font files could not be ` +
            `inlined and still load from jsDelivr (${why}).`);
    }
    log('inlined %d/%d font files', urls.length - remaining, urls.length);

    return {
        html: html.replace(STYLE_BLOCK, (block) => block.replace(FONT_SRC, (whole, url) => {
            const dataUri = fontCache.get(url);
            return dataUri ? `url(${dataUri})` : whole;
        })),
        remaining,
    };
}

async function inlineTwemoji(html, timeoutMs) {
    const urls = [...new Set([...html.matchAll(TWEMOJI_ATTRIBUTE)].map((m) => m[2]))];
    if (urls.length === 0) return html;

    // After an outage, stop paying the timeout for every remaining emoji — within
    // this transcript and, via the TTL, for the ones rendered right after it.
    let outage = recentlyFailed(TWEMOJI_HOST);
    const causes = [];
    const unavailable = new Set();
    await mapWithConcurrency(urls, FETCH_CONCURRENCY, async (url) => {
        if (outage || emojiCache.has(url) || recentlyFailed(url)) return;
        try {
            const svg = await sharedDownload(url, () => fetchText(url, timeoutMs, /<svg\b/));
            emojiCache.set(url, 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64'));
        }
        catch (err) {
            if (!(err instanceof AssetFetchError)) throw err;
            markFailed(url);
            if (err.unavailable) unavailable.add(url);
            else causes.push(describeError(err));
            if (isOutage(err)) {
                outage = true;
                markFailed(TWEMOJI_HOST);
            }
            log('twemoji %s failed: %s', url, describeError(err));
        }
    });

    // Emoji newer than Twemoji 14.0.2 do not exist on the CDN at all: they are broken with or without
    // inlining and nothing here can fix it, so say so once per emoji instead of on every export.
    const fresh = [...unavailable].filter((url) => !warnedUnavailable.has(url));
    fresh.forEach((url) => warnedUnavailable.add(url));
    if (fresh.length > 0) {
        console.warn(`[discord-html-transcripts-fix] inlineAssets: ${fresh.length} emoji ${fresh.length === 1 ? "does" : "do"} not exist in Twemoji 14.0.2 and cannot be ` +
            `inlined (they render as broken images either way): ${fresh.map((u) => u.split('/').pop()).join(', ')}`);
    }
    const missing = urls.filter((url) => !emojiCache.has(url) && !unavailable.has(url) && !warnedUnavailable.has(url)).length;
    if (missing > 0) {
        // Not fatal — those images simply keep loading from cdnjs — but the caller
        // asked for a self-contained file, so say that it is not one, and why.
        const why = causes[0] || (outage ? 'cdnjs was marked unreachable by an earlier failure' : 'unknown');
        console.warn(`[discord-html-transcripts-fix] inlineAssets: ${missing} of ${urls.length} emoji could not be ` +
            `inlined and still load from cdnjs (${why}).`);
    }
    log('inlined %d/%d emoji', urls.length - missing - unavailable.size, urls.length);

    // Replacements are functions on purpose: neither the data URI nor the matched
    // text may be read as a `$&`-style replacement pattern.
    return html
        .replace(TWEMOJI_ATTRIBUTE, (whole, before, url, after) => {
            const dataUri = emojiCache.get(url);
            if (!dataUri) return whole;
            // <discord-reaction emoji=""> only draws an <img> when the value contains
            // "http" or starts with "/" (DiscordReaction.js render()); anything else is
            // printed as text, so a plain data URI showed up as 2 kB of base64. A MIME
            // parameter keeps the URI valid (RFC 2397) and satisfies that check.
            return before + (before.endsWith('emoji="') ? dataUri.replace(';base64,', ';name=http;base64,') : dataUri) + after;
        })
        .replace(TWEMOJI_PRELOAD, (whole, url) => (emojiCache.has(url) ? '' : whole));
}

/**
 * Replaces the third-party CDN references in a rendered transcript with inline
 * copies — the component runtime and the gg sans font from jsDelivr, the emoji
 * from cdnjs — so the file renders without either.
 *
 * Discord's own CDN is deliberately left alone: avatars always load from it, and
 * attachment images do unless `saveImages` is set.
 *
 * Never throws: if anything cannot be fetched the original reference is kept,
 * which still renders correctly as long as the CDNs are reachable.
 */
async function inlineExternalAssets(html, options) {
    const opts = options || {};
    const timeoutMs = resolveTimeout(opts.timeout);
    let out = html;
    let runtimeOnCdn = false;
    let fontsOnCdn = false;

    const scriptTag = out.match(/<script[^<>]*type="module"[^<>]*src="https:\/\/cdn\.jsdelivr\.net(\/npm\/[^"]+)"[^<>]*><\/script>/);
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
            runtimeOnCdn = true;
            reportFailure('the component runtime (kept on jsDelivr)', err);
        }
    }

    try {
        const fonts = await inlineFonts(out, timeoutMs);
        out = fonts.html;
        fontsOnCdn = fonts.remaining > 0;
    }
    catch (err) {
        fontsOnCdn = true;
        reportFailure('the fonts (kept on jsDelivr)', err);
    }

    try {
        out = await inlineTwemoji(out, timeoutMs);
    }
    catch (err) {
        reportFailure('the emoji (kept on cdnjs)', err);
    }

    // Residual audit: decide from what is actually left in the document, not from which code path ran.
    // Matchers that stop recognising the markup would otherwise leave CDN references behind without a word.
    const leftOnJsdelivr = /<script\b[^<>]*\bsrc=["']https:\/\/cdn\.jsdelivr\.net\//.test(out) ||
        (out.match(STYLE_BLOCK) || []).some((block) => block.includes('cdn.jsdelivr.net'));
    if (leftOnJsdelivr && !runtimeOnCdn && !fontsOnCdn) {
        console.warn('[discord-html-transcripts-fix] inlineAssets: the transcript still loads assets from jsDelivr but no download failed — ' +
            'the markup was not recognised. This is a bug in discord-html-transcripts-fix, please report it.');
    }
    // A preconnect makes the browser open a connection to jsDelivr on page load — exactly the request
    // inlining exists to avoid. It stays only while something this package emitted still loads from there.
    if (!leftOnJsdelivr) {
        out = out.replace(/<link[^<>]*rel="preconnect"[^<>]*href="https:\/\/cdn\.jsdelivr\.net\/"[^<>]*\/?>/g, '');
    }

    return out;
}


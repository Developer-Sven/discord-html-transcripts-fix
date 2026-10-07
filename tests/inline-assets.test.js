'use strict';
// Behaviour of `inlineAssets` beyond the happy path: what gets reported, what gets
// cached, what gets embedded. Each case here was a silent failure at some point — a
// bug that looked like a CDN outage, a captive-portal page cached as a font, a 404
// emoji warning on every export, a reaction emoji printed as 2 kB of base64.
// Everything is offline: the CDNs are undici MockAgents.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { Readable } = require('node:stream');
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici');
const { generateFromMessages, ExportReturnType } = require('../dist/index.js');
const { clearInlineAssetCache, inlineExternalAssets } = require('../dist/utils/selfContained.js');

const ORIGINAL_DISPATCHER = getGlobalDispatcher();
const WOFF2 = 'wOF2-FAKE';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"/>';
const JS = 'export const ready = true;';
const HTML = '<!doctype html><title>Sign in</title>';
const ENTRY = '/npm/@skyra/discord-components-core@4.0.2/+esm';
const OLD = new Date(2025, 0, 3, 15, 4);
const twemoji = (hex) => 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/' + hex + '.svg';

class FakeCollection extends Map {}

function makeChannel() {
    return {
        id: '222222222222222222', name: 'ticket-0001', type: 0, topic: null,
        isDMBased: () => false, isThread: () => false, isTextBased: () => true, isVoiceBased: () => false,
        guild: {
            id: '333333333333333333', name: 'Test Guild', iconURL: () => null,
            roles: { cache: new FakeCollection(), fetch: async () => null },
            members: { cache: new FakeCollection(), fetch: async () => new FakeCollection() },
            channels: { cache: new FakeCollection() },
        },
        client: { users: { cache: new FakeCollection(), fetch: async () => null }, channels: { fetch: async () => null } },
    };
}

function makeMessage(content, extra = {}) {
    return {
        id: '1', content, createdAt: OLD, editedAt: null,
        author: { id: '111111111111111111', username: 'tester', displayName: 'Tester', bot: false, discriminator: '0', avatarURL: () => null, displayAvatarURL: () => null },
        member: { nickname: null, roles: { cache: new FakeCollection(), color: null }, displayHexColor: null },
        system: false, type: 0, pinned: false, flags: 0, reference: null, interaction: null,
        embeds: [], components: [], attachments: new FakeCollection(), stickers: new FakeCollection(), reactions: { cache: new FakeCollection() },
        mentions: { everyone: false, users: new FakeCollection(), roles: new FakeCollection(), channels: new FakeCollection() },
        messageSnapshots: [], webhookId: null, poll: null,
        ...extra,
    };
}

/**
 * Installs offline CDNs for one test. `runtime`, `font` and `emoji` map a request
 * path to a response `{ status, body, type }`; `errors` lists
 * `[origin, pathRegex, error]` that fail at the network level instead.
 */
function cdn(t, { runtime, font, emoji, errors = [] } = {}) {
    clearInlineAssetCache();
    const agent = new MockAgent();
    agent.disableNetConnect();
    const serve = (origin, path, respond) => agent.get(origin).intercept({ path, method: 'GET' }).reply((opts) => {
        const r = respond(opts.path);
        return { statusCode: r.status ?? 200, data: r.body, responseOptions: { headers: r.type ? { 'content-type': r.type } : {} } };
    }).persist();
    for (const [origin, path, error] of errors) agent.get(origin).intercept({ path, method: 'GET' }).replyWithError(error).persist();
    serve('https://cdn.jsdelivr.net', /\.woff2$/, font || (() => ({ body: WOFF2, type: 'font/woff2' })));
    serve('https://cdn.jsdelivr.net', /^\/npm\//, runtime || (() => ({ body: JS, type: 'application/javascript' })));
    serve('https://cdnjs.cloudflare.com', /.*/, emoji || (() => ({ body: SVG, type: 'image/svg+xml' })));
    const requests = [];
    setGlobalDispatcher(agent.compose((dispatch) => (opts, handler) => {
        requests.push(String(opts.origin) + opts.path);
        return dispatch(opts, handler);
    }));
    t.after(async () => {
        setGlobalDispatcher(ORIGINAL_DISPATCHER);
        await agent.close();
        clearInlineAssetCache();
    });
    return { requests, hits: (fragment) => requests.filter((r) => r.includes(fragment)).length };
}

function spyConsole(t) {
    const warn = t.mock.method(console, 'warn', () => {});
    const error = t.mock.method(console, 'error', () => {});
    const text = (spy) => spy.mock.calls.map((c) => c.arguments.map(String).join(' '));
    return { warns: () => text(warn), errors: () => text(error) };
}

const render = (content, options = {}, extra = {}) =>
    generateFromMessages([makeMessage(content, extra)], makeChannel(), { returnType: ExportReturnType.String, inlineAssets: true, ...options });

// --- reporting ---------------------------------------------------------------------

test('a failure to inline is reported, and the warning names its cause', async (t) => {
    const log = spyConsole(t);
    cdn(t, { font: () => ({ status: 403, body: 'blocked', type: 'text/plain' }), emoji: () => ({ status: 503, body: 'down', type: 'text/plain' }) });
    await render('grin \u{1F600}');
    const text = log.warns().join('\n');
    assert.match(text, /font files could not be inlined[^\n]*403/);
    assert.match(text, /1 of 1 emoji could not be inlined[^\n]*503/);
});

test('a bug inside the inliner is reported as a bug, with its stack, and does not pin the CDN', async (t) => {
    const log = spyConsole(t);
    const net = cdn(t);
    const original = Buffer.prototype.toString;
    Buffer.prototype.toString = function (encoding, ...rest) {
        if (encoding === 'base64') throw new TypeError('injected programming error');
        return original.call(this, encoding, ...rest);
    };
    t.after(() => { Buffer.prototype.toString = original; });
    const first = await render('hello');
    Buffer.prototype.toString = original;
    assert.ok(first.includes('cdn.jsdelivr.net/gh/'), 'the export still succeeds and keeps the CDN reference');
    assert.ok(log.errors().some((e) => /injected programming error/.test(e)), 'the real TypeError reaches console.error');
    const before = net.hits('.woff2');
    const second = await render('hello');
    assert.ok(net.hits('.woff2') > before, 'a bug must not blacklist the CDN: the next export asks again');
    assert.ok(second.includes('data:font/woff2;base64,'), 'and inlines the fonts');
});

// --- classification of failures --------------------------------------------------------

test('a 404 for one emoji is not a host outage', async (t) => {
    spyConsole(t);
    const net = cdn(t, { emoji: (p) => (p.endsWith('/1f600.svg') ? { status: 404, body: 'nope' } : { body: SVG }) });
    const first = await render('\u{1F600} \u{1F601}');
    assert.ok(first.includes(twemoji('1f600')), 'the missing emoji keeps its CDN url');
    assert.ok(!first.includes(twemoji('1f601')), 'the healthy emoji next to it is inlined');
    const second = await render('\u{1F602}');
    assert.ok(!second.includes(twemoji('1f602')), 'a later transcript still downloads');
    assert.equal(net.hits('cdnjs'), 3);
});

test('a 5xx marks the whole host: a different emoji in the next transcript is not requested', async (t) => {
    spyConsole(t);
    const net = cdn(t, { emoji: () => ({ status: 503, body: 'down' }) });
    await render('\u{1F600}');
    await render('\u{1F602}');
    assert.equal(net.hits('cdnjs'), 1);
});

test('one reset socket does not blacklist the host for the following exports', async (t) => {
    spyConsole(t);
    const reset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const net = cdn(t, { errors: [['https://cdnjs.cloudflare.com', /1f603\.svg$/, reset]] });
    await render(Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0x1f600 + i)).join(' '));
    const before = net.requests.length;
    const html = await render(Array.from({ length: 6 }, (_, i) => String.fromCodePoint(0x1f610 + i)).join(' '));
    assert.ok(net.requests.length > before, 'the next export still talks to cdnjs');
    assert.ok(!html.includes('cdnjs.cloudflare.com/ajax'), 'and its emoji are inlined');
});

test('an emoji that does not exist on the CDN is reported once, not on every export', async (t) => {
    const log = spyConsole(t);
    cdn(t, { emoji: () => ({ status: 404, body: 'Not Found', type: 'text/html' }) });
    await render('shaking \u{1FAE8}');
    await render('shaking \u{1FAE8}');
    assert.ok(log.warns().filter((w) => /1fae8/.test(w)).length <= 1);
    assert.ok(!log.warns().some((w) => /still load from cdnjs/.test(w)), 'a 404 does not "still load" from anywhere');
});

test('a slow CDN is cut off by inlineAssetsTimeout', async (t) => {
    // Drives the inliner directly so no React render sits inside the measured window.
    spyConsole(t);
    clearInlineAssetCache();
    const agent = new MockAgent();
    agent.disableNetConnect();
    agent.get('https://cdn.jsdelivr.net').intercept({ path: /.*/, method: 'GET' }).reply(200, 'x').delay(3000).persist();
    setGlobalDispatcher(agent);
    t.after(async () => { setGlobalDispatcher(ORIGINAL_DISPATCHER); await agent.close(); clearInlineAssetCache(); });
    const started = Date.now();
    const out = await inlineExternalAssets(`<html><head><script type="module" src="https://cdn.jsdelivr.net${ENTRY}" crossorigin="anonymous"></script></head></html>`, { timeout: 100 });
    assert.ok(Date.now() - started < 1500, 'the inliner must not wait for the slow CDN');
    assert.ok(out.includes('cdn.jsdelivr.net/npm/'), 'the runtime keeps its CDN reference');
});

// --- content validation ------------------------------------------------------------------

test('a 200 response that is an HTML interstitial is neither embedded nor cached', async (t) => {
    const log = spyConsole(t);
    cdn(t, {
        font: () => ({ body: HTML, type: 'text/html' }),
        runtime: () => ({ body: HTML, type: 'text/html' }),
        emoji: () => ({ body: HTML, type: 'text/html' }),
    });
    const html = await render('grin \u{1F600}');
    assert.ok(!html.includes('URL.createObjectURL'), 'HTML must not become the component runtime');
    assert.ok(!html.includes('data:font/woff2'), 'HTML must not become a font');
    assert.ok(!html.includes('data:image/svg+xml'), 'HTML must not become an emoji');
    assert.ok(log.warns().length >= 3, 'each of the three assets reports that it was not inlined');
});

test('a 200 with the right type but the wrong bytes is rejected too', async (t) => {
    spyConsole(t);
    cdn(t, { font: () => ({ body: 'this is not a woff2 file', type: 'font/woff2' }), emoji: () => ({ body: 'nope', type: 'image/svg+xml' }) });
    const html = await render('grin \u{1F600}');
    assert.ok(!html.includes('data:font/woff2'), 'bytes without the wOF2 signature are not a font');
    assert.ok(!html.includes('data:image/svg+xml'), 'text without <svg is not an emoji');
});

// --- the runtime graph ---------------------------------------------------------------------------

test('minified sources survive replacement patterns and cannot close the script element', async (t) => {
    const source = 'export const s = "' + '$' + "'" + '$`$&$$' + '</script><img src=x onerror=alert(1)>"; // ' + String.fromCharCode(0x2028);
    cdn(t, { runtime: () => ({ body: source }) });
    const html = await render('hello');
    const m = html.match(/var G=(\{[\s\S]*?\});var urls=\{\};/);
    assert.ok(m, 'bootstrap payload present');
    assert.equal(JSON.parse(m[1]).sources[ENTRY], source, 'the source arrives byte for byte');
    assert.ok(!m[1].includes('</script'), 'the payload cannot close the script element');
    assert.ok(!m[1].includes('<img'), 'the payload carries no raw markup');
});

test('every /npm/ specifier is rewritten to the blob url of its dependency, dependencies first', async (t) => {
    const mods = {
        [ENTRY]: 'import a from"/npm/dep-a/+esm";import"/npm/dep-b/+esm";export default a;',
        '/npm/dep-a/+esm': "import b from '/npm/dep-b/+esm';export default b;",
        '/npm/dep-b/+esm': 'export default 1;',
    };
    cdn(t, { runtime: (p) => (mods[p] ? { body: mods[p] } : { status: 404, body: 'no' }) });
    const html = await render('hello');
    const script = html.match(/<script>(\(function\(\)\{try\{var G=[\s\S]*?)<\/script>/)[1];
    const blobs = [];
    const sandbox = {
        URL: { createObjectURL: (blob) => { blobs.push(blob.text); return 'blob:mock/' + (blobs.length - 1); } },
        Blob: class { constructor(parts) { this.text = parts[0]; } },
        console: { error: () => {} },
    };
    vm.runInNewContext(script, sandbox, { importModuleDynamically: () => ({}) });
    assert.equal(blobs.length, 3, 'one blob per module');
    assert.deepEqual(blobs.map((b) => /\/npm\//.test(b)), [false, false, false], 'no /npm/ specifier survives');
    assert.ok(blobs[0].startsWith('export default 1'), 'the leaf module is built first');
    assert.ok(blobs[1].includes('blob:mock/0'), 'dep-a imports the blob of dep-b');
    assert.ok(blobs[2].includes('blob:mock/1') && blobs[2].includes('blob:mock/0'), 'the entry imports both');
});

test('a relative import falls back to the CDN with a logged reason, and the fonts are still inlined', async (t) => {
    const log = spyConsole(t);
    cdn(t, { runtime: () => ({ body: 'import x from "./sibling.js";export default x;' }) });
    const html = await render('hello');
    assert.match(html, /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\//);
    assert.ok(!html.includes('URL.createObjectURL'));
    assert.ok(log.warns().some((w) => /relative import/.test(w)), log.warns().join('\n'));
    assert.ok(html.includes('data:font/woff2;base64,'), 'jsDelivr is healthy, so the fonts are still inlined');
});

test('a specifier the browser-side rewrite could not resolve falls back to the CDN', async (t) => {
    const log = spyConsole(t);
    cdn(t, { runtime: (p) => ({ body: p === ENTRY ? 'import a from "/npm/dep-a/+esm' + "'" + ';export default a;' : 'export default 1;' }) });
    const html = await render('hello');
    assert.match(html, /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\//, 'mismatched quotes cannot be rewritten');
    assert.ok(log.warns().some((w) => /unresolved specifier/.test(w)), log.warns().join('\n'));
});

test('an import cycle falls back to the CDN with a logged reason', async (t) => {
    const log = spyConsole(t);
    const mods = { [ENTRY]: 'import"/npm/a/+esm";', '/npm/a/+esm': `import"${ENTRY}";` };
    cdn(t, { runtime: (p) => (mods[p] ? { body: mods[p] } : { status: 404, body: 'no' }) });
    const html = await render('hello');
    assert.match(html, /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\//);
    assert.ok(log.warns().some((w) => /import cycle/.test(w)), log.warns().join('\n'));
});

// --- caching and sharing ---------------------------------------------------------------------------

test('downloads happen once per process', async (t) => {
    const net = cdn(t);
    await render('\u{1F600}');
    const afterFirst = net.requests.length;
    await render('\u{1F600}');
    assert.equal(net.requests.length, afterFirst, 'the second transcript is served from the caches');
});

test('concurrent cold exports share one download per asset', async (t) => {
    const net = cdn(t);
    await Promise.all([render('\u{1F600}'), render('\u{1F600}'), render('\u{1F600}')]);
    assert.equal(net.hits(ENTRY), 1, 'one runtime download');
    assert.equal(net.hits('ggsans-normal-400.woff2'), 1, 'one download per font file');
    assert.equal(net.hits('1f600.svg'), 1, 'one download per emoji');
});

// --- preconnect and leftovers -----------------------------------------------------------------------

test('the preconnect stays when only the runtime or only the fonts remain on jsDelivr', async (t) => {
    spyConsole(t);
    cdn(t, { runtime: () => ({ status: 404, body: 'gone' }) });
    let html = await render('hello');
    assert.match(html, /rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net\/"/, 'the runtime is still on the CDN');
    assert.ok(html.includes('data:font/woff2;base64,'), 'a 404 runtime is not a host outage: fonts were inlined');

    cdn(t, { font: () => ({ status: 404, body: 'gone' }) });
    html = await render('hello');
    assert.match(html, /rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net\/"/, 'the fonts are still on the CDN');
    assert.ok(html.includes('URL.createObjectURL'), 'the runtime was inlined');
});

test('markup the inliner does not recognise keeps the preconnect and is reported', async (t) => {
    const log = spyConsole(t);
    cdn(t);
    const out = await inlineExternalAssets('<head><link rel="preconnect" href="https://cdn.jsdelivr.net/"/><script src="https://cdn.jsdelivr.net/npm/x@1.0.0/+esm" type="module"></script></head>');
    assert.ok(/<link[^>]*preconnect/.test(out), 'jsDelivr is still used, so the preconnect stays');
    assert.ok(log.warns().some((w) => /still loads assets from jsDelivr/.test(w)), 'the unrecognised markup is reported');
});

// --- output shape ----------------------------------------------------------------------------------------

test('an inlined reaction emoji is still drawn as an image by <discord-reaction>', async (t) => {
    cdn(t);
    const html = await render('hi', {}, {
        reactions: { cache: new FakeCollection([['r', { emoji: { id: null, name: '\u{1F44D}', animated: false }, count: 2, me: false }]]) },
    });
    const value = html.match(/<discord-reaction[^>]*\semoji="([^"]*)"/)[1];
    assert.ok(value.startsWith('data:image/svg+xml;'), 'the emoji is inlined');
    // DiscordReaction.js renders <img src=emoji> only when the value includes "http"
    // or starts with "/" or "./"; anything else is printed as visible text.
    assert.ok(value.includes('http') || value.startsWith('/') || value.startsWith('./'), 'the component would print this as text');
});

test('inlineAssets + stream yields a byte stream of Buffers, like the plain stream', async (t) => {
    cdn(t);
    const stream = await generateFromMessages([makeMessage('Grüße')], makeChannel(), { returnType: ExportReturnType.Stream, inlineAssets: true });
    assert.ok(stream instanceof Readable);
    assert.equal(stream.readableObjectMode, false, 'plain streams are byte streams');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.ok(chunks.every((c) => Buffer.isBuffer(c)), 'every chunk is a Buffer');
    const text = Buffer.concat(chunks).toString('utf8');
    assert.ok(text.includes('URL.createObjectURL'));
    // The visible text is split by React's <!-- --> separators; the search index
    // keeps the word in one piece and proves the UTF-8 survived the Buffer chunks.
    assert.ok(text.includes('data-text="grüße"'), 'multi-byte characters survive');
});

// Must stay last: proves no test above leaked a mock dispatcher.
test('the global dispatcher is restored after every test', () => {
    assert.equal(getGlobalDispatcher(), ORIGINAL_DISPATCHER);
});

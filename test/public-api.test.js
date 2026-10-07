'use strict';
// Every option documented for createTranscript / generateFromMessages must reach
// the code that reads it. These tests go through the public entry point on
// purpose: 2.1.0 and 2.2.0 shipped dateFormat, timeFormat, inlineAssets and
// inlineAssetsTimeout as silently ignored because they were only ever exercised
// against the internal renderer — the same way statsFooter was lost once before.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici');
const { generateFromMessages, ExportReturnType } = require('../dist/index.js');
const generator = require('../dist/generator');
const { clearInlineAssetCache } = require('../dist/utils/selfContained.js');

class FakeCollection extends Map {}

function makeChannel() {
    return {
        id: '222222222222222222',
        name: 'ticket-0001',
        type: 0,
        topic: null,
        isDMBased: () => false,
        isThread: () => false,
        isTextBased: () => true,
        isVoiceBased: () => false,
        guild: {
            id: '333333333333333333',
            name: 'Test Guild',
            iconURL: () => null,
            roles: { cache: new FakeCollection(), fetch: async () => null },
            members: { cache: new FakeCollection(), fetch: async () => new FakeCollection() },
            channels: { cache: new FakeCollection() },
        },
        client: {
            users: { cache: new FakeCollection(), fetch: async () => null },
            channels: { fetch: async () => null },
        },
    };
}

function makeMessage(id, content, createdAt, extra = {}) {
    const author = {
        id: '111111111111111111',
        username: 'tester',
        displayName: 'Tester',
        bot: false,
        discriminator: '0',
        avatarURL: () => null,
        displayAvatarURL: () => null,
    };
    return {
        id,
        content,
        createdAt,
        editedAt: null,
        author,
        member: { nickname: null, roles: { cache: new FakeCollection(), color: null }, displayHexColor: null },
        system: false,
        type: 0,
        pinned: false,
        flags: 0,
        reference: null,
        interaction: null,
        embeds: [],
        components: [],
        attachments: new FakeCollection(),
        stickers: new FakeCollection(),
        reactions: { cache: new FakeCollection() },
        mentions: {
            everyone: false,
            users: new FakeCollection(),
            roles: new FakeCollection(),
            channels: new FakeCollection(),
        },
        messageSnapshots: [],
        webhookId: null,
        poll: null,
        ...extra,
    };
}

// Far enough in the past that the formatter always takes the full-date branch,
// independent of when the suite runs. Built from local parts, as is the output.
const OLD = new Date(2025, 0, 3, 15, 4);
const GRIN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f600.svg';

function timestampOf(html) {
    const match = html.match(/<discord-message[^>]*?timestamp="([^"]*)"/);
    return match ? match[1] : undefined;
}

async function renderString(messages, options) {
    const html = await generateFromMessages(messages, makeChannel(), {
        returnType: ExportReturnType.String,
        ...options,
    });
    // A message that throws while rendering is swallowed into a bare placeholder.
    // Without this check a fixture that drifted from what the renderer reads
    // would surface as a confusing assertion failure much further down.
    assert.ok(!html.includes('failed to render'), 'a fixture message failed to render');
    return html;
}

function render(options) {
    return renderString([makeMessage('1', 'hello', OLD)], options);
}

/**
 * Installs an offline CDN for one test: jsDelivr serves a one-module runtime and
 * cdnjs serves a tiny SVG. `requests` records every dispatched request with the
 * timeouts it was sent with. Restored automatically when the test ends.
 */
// Captured once: restoring whatever was current when a mock was installed would,
// with several mocks in one test, end on an already closed MockAgent.
const ORIGINAL_DISPATCHER = getGlobalDispatcher();

function mockCdn(t, { twemojiStatus = 200, twemojiError = null, jsdelivrError = null } = {}) {
    clearInlineAssetCache();
    const agent = new MockAgent();
    agent.disableNetConnect();
    const jsdelivr = agent.get('https://cdn.jsdelivr.net');
    if (jsdelivrError) {
        jsdelivr.intercept({ path: /.*/, method: 'GET' }).replyWithError(jsdelivrError).persist();
    }
    else {
        // Starts with the WOFF2 signature, which the inliner checks before embedding.
        jsdelivr.intercept({ path: /\.woff2$/, method: 'GET' }).reply(200, 'wOF2-FAKE').persist();
        jsdelivr.intercept({ path: /.*/, method: 'GET' }).reply(200, 'export const ready = true;').persist();
    }
    const cdnjs = agent.get('https://cdnjs.cloudflare.com').intercept({ path: /.*/, method: 'GET' });
    if (twemojiError) cdnjs.replyWithError(twemojiError).persist();
    else cdnjs.reply(twemojiStatus, '<svg xmlns="http://www.w3.org/2000/svg"/>').persist();

    const requests = [];
    setGlobalDispatcher(agent.compose((dispatch) => (opts, handler) => {
        requests.push({
            origin: String(opts.origin),
            path: opts.path,
            headersTimeout: opts.headersTimeout,
            bodyTimeout: opts.bodyTimeout,
            signal: opts.signal,
        });
        return dispatch(opts, handler);
    }));
    t.after(async () => {
        setGlobalDispatcher(ORIGINAL_DISPATCHER);
        await agent.close();
        clearInlineAssetCache();
    });
    return { agent, requests };
}

// --- dateFormat / timeFormat ----------------------------------------------

test('defaults: 24h clock and dd/mm/yyyy', async () => {
    assert.equal(timestampOf(await render({})), '03/01/2025 15:04');
});

test('timeFormat reaches the renderer through the public API', async () => {
    assert.equal(timestampOf(await render({ timeFormat: '12h' })), '03/01/2025 03:04 PM');
});

test('dateFormat reaches the renderer through the public API', async () => {
    assert.equal(timestampOf(await render({ dateFormat: 'mm/dd/yyyy' })), '01/03/2025 15:04');
});

test('dateFormat and timeFormat combine', async () => {
    assert.equal(
        timestampOf(await render({ dateFormat: 'mm/dd/yyyy', timeFormat: '12h' })),
        '01/03/2025 03:04 PM',
    );
});

// --- drift guard --------------------------------------------------------------

// Derived from the published typings, so an option declared in the future cannot
// be forgotten in the hand-maintained pass-through list again.
{
    const dts = fs.readFileSync(path.join(__dirname, '../dist/types.d.ts'), 'utf8');
    const block = dts.slice(dts.indexOf('GenerateFromMessagesOptions<'), dts.indexOf('CreateTranscriptOptions'));
    const declared = [...block.matchAll(/^ {4}(\w+)\??:/gm)].map((m) => m[1]);
    // Consumed or reshaped by the public layer itself rather than forwarded as-is.
    const NOT_FORWARDED_VERBATIM = new Set(['filename', 'callbacks', 'stream']);

    test('drift guard parses the declared options', () => {
        assert.ok(declared.length >= 12, `expected the options block, got: ${declared.join(', ')}`);
        for (const key of ['dateFormat', 'timeFormat', 'inlineAssets', 'inlineAssetsTimeout', 'statsFooter']) {
            assert.ok(declared.includes(key), `${key} missing from the parsed option list`);
        }
    });

    for (const key of declared.filter((k) => !NOT_FORWARDED_VERBATIM.has(k))) {
        test(`option "${key}" reaches the renderer`, async (t) => {
            const original = generator.default;
            let seen;
            generator.default = async (args) => {
                seen = args;
                return '';
            };
            t.after(() => {
                generator.default = original;
            });
            const sentinel = Symbol(key);
            await generateFromMessages([], { id: '1', isDMBased: () => true }, {
                returnType: ExportReturnType.String,
                [key]: sentinel,
            });
            assert.equal(seen[key], sentinel, `"${key}" was dropped before reaching the renderer`);
        });
    }
}

// --- stream contract -------------------------------------------------------------

test('hydrate does not break the stream contract', async () => {
    for (const options of [{ returnType: 'stream', hydrate: true }, { stream: true, hydrate: true }]) {
        const result = await generateFromMessages([makeMessage('1', 'hello', OLD)], makeChannel(), options);
        assert.ok(result instanceof Readable, `${JSON.stringify(options)} must return a Readable`);
        result.destroy();
    }
});

test('hydrate still emits the spoiler-reveal script', async () => {
    // The class name alone also appears in the stylesheet of every page, so look
    // for the script's own DOM query instead.
    const marker = "querySelectorAll('.discord-spoiler')";
    assert.ok(!(await render({})).includes(marker), 'no spoiler script without hydrate');
    assert.ok((await render({ hydrate: true })).includes(marker), 'spoiler script with hydrate');
});

// --- inlineAssets ----------------------------------------------------------------

test('without inlineAssets the component runtime is loaded from the CDN', async () => {
    const html = await render({});
    assert.match(html, /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\/@skyra\/discord-components-core@/);
});

test('inlineAssets reaches the renderer through the public API', async (t) => {
    const { agent } = mockCdn(t);
    const html = await renderString([makeMessage('1', 'emoji \u{1F600}', OLD)], { inlineAssets: true });

    assert.ok(!html.includes('cdn.jsdelivr.net/npm/'), 'component runtime must no longer come from jsDelivr');
    assert.ok(html.includes('URL.createObjectURL'), 'inline bootstrap must be present');
    assert.ok(html.includes('export const ready = true;'), 'the mocked runtime must be embedded');
    assert.ok(html.includes('data:image/svg+xml;base64,'), 'the mocked emoji must be embedded');
    assert.ok(!html.includes('cdnjs.cloudflare.com'), 'no emoji may still load from cdnjs');
    agent.assertNoPendingInterceptors();
});

test('inlineAssetsTimeout reaches the asset downloader through the public API', async (t) => {
    const { requests } = mockCdn(t);
    await renderString([makeMessage('1', 'emoji \u{1F600}', OLD)], { inlineAssets: true, inlineAssetsTimeout: 1234 });
    assert.ok(requests.length >= 2, 'expected the runtime and the emoji to be requested');
    for (const r of requests) {
        assert.equal(r.headersTimeout, 1234, `${r.origin}${r.path}`);
        assert.equal(r.bodyTimeout, 1234, `${r.origin}${r.path}`);
    }
});

test('an unusable inlineAssetsTimeout falls back to the default and says so', async (t) => {
    // One subtest per value, so every mock is restored before the next is installed.
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 31, '30s']) {
        await t.test(String(bad), async (st) => {
            const warn = st.mock.method(console, 'warn', () => {});
            const { requests } = mockCdn(st);
            const html = await renderString([makeMessage('1', 'emoji \u{1F600}', OLD)], {
                inlineAssets: true,
                inlineAssetsTimeout: bad,
            });
            assert.ok(html.includes('URL.createObjectURL'), `timeout ${bad}: inlining must still happen`);
            assert.ok(requests.every((r) => r.headersTimeout === 30000), `timeout ${bad} must fall back to 30000`);
            assert.ok(
                warn.mock.calls.some((c) => /inlineAssetsTimeout must be/.test(String(c.arguments[0]))),
                'the fallback is reported',
            );
        });
    }
});

test('a numeric string inlineAssetsTimeout, as read from an environment variable, is honoured', async (t) => {
    const { requests } = mockCdn(t);
    await renderString([makeMessage('1', 'emoji \u{1F600}', OLD)], { inlineAssets: true, inlineAssetsTimeout: '4321' });
    assert.ok(requests.length >= 2, 'expected the runtime and the emoji to be requested');
    assert.ok(requests.every((r) => r.headersTimeout === 4321));
});

test('inlineAssets rewrites emoji images but never what users wrote', async (t) => {
    mockCdn(t);
    // The user types the very URL that is also rendered as the emoji image, so a
    // document-wide find-and-replace would be caught here.
    const message = makeMessage('1', `grin \u{1F600} typed ${GRIN_URL}`, OLD, {
        reactions: {
            cache: new FakeCollection([
                ['r', { emoji: { id: null, name: '\u{1F44D}', animated: false }, count: 2, me: false }],
            ]),
        },
    });
    const html = await renderString([message], { inlineAssets: true });

    assert.match(html, /<img[^>]*class="dht-emoji"[^>]*src="data:image\/svg\+xml;base64,/, 'emoji image inlined');
    // <discord-reaction> only draws an <img> for values containing "http" (or starting
    // with "/"); anything else is printed as text. The inlined value must pass that.
    const reaction = html.match(/<discord-reaction[^>]*\semoji="([^"]*)"/)[1];
    assert.ok(reaction.startsWith('data:image/svg+xml;name=http;base64,'), 'reaction emoji inlined');
    assert.ok(reaction.includes('http'), 'the reaction component would print this value as text');
    assert.ok(html.includes(`href="${GRIN_URL}"`), 'the link the user posted must keep its URL');
    assert.ok(html.includes(`>${GRIN_URL}<`), 'the text the user wrote must stay verbatim');
    assert.match(html, new RegExp(`data-text="[^"]*${GRIN_URL.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`), 'the search index keeps the original text');
    assert.ok(!/<link[^>]*rel="preload"[^>]*cdnjs/.test(html), 'no preload hint may point at cdnjs any more');
});

test('inlineAssets embeds the gg sans font and drops the jsDelivr preconnect', async (t) => {
    mockCdn(t);
    const fontUrl = 'https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-normal-400.woff2';
    // Inline code keeps the literal `url(...)` in the output (plain text would be
    // auto-linked and split), so a document-wide font rewrite is caught here.
    const html = await renderString([makeMessage('1', 'font `url(' + fontUrl + ')` typed', OLD)], { inlineAssets: true });

    const styles = (html.match(/<style\b[^>]*>[\s\S]*?<\/style>/g) || []).join('');
    assert.ok(styles.includes('@font-face'), 'the font rules are still there');
    assert.ok(!styles.includes('cdn.jsdelivr.net'), 'no font may still load from jsDelivr');
    assert.ok(styles.includes('data:font/woff2;base64,' + Buffer.from('wOF2-FAKE').toString('base64')));
    const transcript = html.slice(html.indexOf('<discord-messages'));
    assert.ok(transcript.includes('url(' + fontUrl + ')'), 'what the user wrote stays verbatim');
    assert.ok(!/<link[^>]*rel="preconnect"[^>]*jsdelivr/.test(html), 'the preconnect would reach jsDelivr on load');
});

test('when jsDelivr is down, runtime and fonts keep their CDN references and the host is not retried per file', async (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const { requests } = mockCdn(t, { jsdelivrError: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) });
    const html = await renderString([makeMessage('1', 'hello', OLD)], { inlineAssets: true });

    assert.ok(warn.mock.calls.some((c) => /ECONNREFUSED/.test(String(c.arguments[0]))), 'the warning names the cause');
    assert.match(html, /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\//, 'runtime falls back to the CDN');
    assert.match(html, /url\(https:\/\/cdn\.jsdelivr\.net\/gh\//, 'fonts fall back to the CDN');
    assert.match(html, /<link[^>]*rel="preconnect"[^>]*jsdelivr/, 'the preconnect stays while the CDN is still used');
    const jsdelivrHits = requests.filter((r) => r.origin.includes('jsdelivr')).length;
    assert.equal(jsdelivrHits, 1, 'after the runtime failed, the ten font files must not each wait for a timeout');
});

test('a failed emoji download is retried after the failure window, not cached forever', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 0, 1) });
    t.mock.method(console, 'warn', () => {});
    const { requests } = mockCdn(t, { twemojiStatus: 500 });
    const messages = [makeMessage('1', 'emoji \u{1F600}', OLD)];
    const cdnjsHits = () => requests.filter((r) => r.origin.includes('cdnjs')).length;

    const first = await renderString(messages, { inlineAssets: true });
    assert.ok(first.includes(GRIN_URL), 'a failed emoji keeps its CDN reference');
    assert.equal(cdnjsHits(), 1);

    await renderString(messages, { inlineAssets: true });
    assert.equal(cdnjsHits(), 1, 'within the failure window the CDN is not asked again');

    t.mock.timers.tick(61_000);
    await renderString(messages, { inlineAssets: true });
    assert.equal(cdnjsHits(), 2, 'after the failure window the download is retried');
});

test('an unreachable emoji CDN is abandoned after the first wave instead of timing out per emoji', async (t) => {
    const { requests } = mockCdn(t, { twemojiError: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) });
    // Ten distinct emoji, all failing at the network level.
    const content = Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0x1f600 + i)).join(' ');
    const html = await renderString([makeMessage('1', content, OLD)], { inlineAssets: true });

    const cdnjsHits = requests.filter((r) => r.origin.includes('cdnjs')).length;
    assert.ok(cdnjsHits <= 6, `at most one concurrent wave may be attempted, saw ${cdnjsHits}`);
    assert.ok(html.includes('cdnjs.cloudflare.com'), 'emoji that could not be inlined keep their CDN reference');
});

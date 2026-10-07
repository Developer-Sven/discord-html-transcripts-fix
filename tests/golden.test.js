'use strict';
// Golden-output tests: every scenario in fixtures/scenarios.js is rendered through
// the public API with REAL discord.js structures and compared with the stored
// transcript in golden/<scenario>.html.
//
//   npm test                compare against the stored snapshots
//   npm run test:update     (re)write them after an intended change
//                           (or set UPDATE_GOLDEN=1 for any test command)
//
// The large static CSS/JS blocks from dist/static/client.js are identical in every
// transcript. They are replaced by a named marker in the snapshot so a change to one
// of them does not rewrite every file; golden/static-blocks.json pins their content
// instead, so such a change still has to be acknowledged.
//
// Beyond the markup, every scenario must pass the guards below: attributes the
// components actually read, scripts that parse, no active content, no unexpected
// warnings or errors.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Readable } = require('node:stream');
const { renderScenario, scenarios } = require('./helpers/render');
const { attributeProblems, INSTALLED_VERSION } = require('./helpers/components');
const client = require('../dist/static/client.js');

const GOLDEN_DIR = path.join(__dirname, 'golden');
const STATIC_PINS = path.join(GOLDEN_DIR, 'static-blocks.json');
// npm passes the script name to every child process, which the test runner spawns
// one per file; that keeps `npm run test:update` free of shell-specific env syntax.
const UPDATE = process.env.UPDATE_GOLDEN === '1' || process.env.npm_lifecycle_event === 'test:update';
const UPDATE_HINT = 'If the change is intended, run: npm run test:update';
// An update run passes by definition; on CI it would verify nothing.
if (UPDATE && process.env.CI) throw new Error('refusing to rewrite the golden snapshots on CI');

const STATIC_BLOCKS = new Map(
    Object.entries(client).filter(([, value]) => typeof value === 'string').map(([name, value]) => [value, name]),
);

function normalize(html) {
    return html.replace(/<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/g, (whole, tag, attrs, body) => {
        const name = STATIC_BLOCKS.get(body);
        return name ? `<${tag}${attrs}><!-- static: ${name} --></${tag}>` : whole;
    });
}

/** Every classic inline script must parse, and the data island must be valid JSON: the
 *  page swallows a broken island silently, which kills search, filters and popups. */
function assertScriptsParse(html) {
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
        const type = attrs.match(/\stype="([^"]*)"/)?.[1];
        if (type === 'application/json') {
            try {
                JSON.parse(body);
            }
            catch (err) {
                assert.fail(`a JSON data island does not parse: ${err.message}\n${body.slice(0, 200)}`);
            }
            continue;
        }
        // Module scripts are not classic scripts.
        if (type && type !== 'text/javascript') continue;
        if (!body.trim()) continue;
        try {
            new vm.Script(body);
        }
        catch (err) {
            assert.fail(`an inline <script> does not parse: ${err.message}\n${body.slice(0, 200)}`);
        }
    }
}

// What React puts in place of a javascript: URL it refuses to render.
const REACT_BLOCKED_URL = "javascript:throw new Error(&#x27;React has blocked a javascript: URL as a security precaution.&#x27;)";

const decodeEntities = (value) => value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|quot|lt|gt);/g, (_, name) => ({ amp: '&', quot: '"', lt: '<', gt: '>' })[name]);

// Attributes whose value is used as a URL — by the browser, or by a component that
// puts it into its own <a href> or <img src> without checking it.
const URL_ATTRIBUTE = /^(href|src|action|formaction|poster|url|image|thumbnail|avatar|icon|emoji)$|-(url|image|avatar|icon)$/i;

/** No user-controlled text may turn into markup that runs: event handlers or script URLs. */
function assertNoActiveContent(html) {
    // Outside the scripts and styles this library ships itself. React quotes every
    // attribute value and escapes quotes and brackets inside it, so a tag can be
    // split into its attributes reliably.
    const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '');
    for (const [tag, attributeList] of markup.matchAll(/<[a-zA-Z][\w-]*([^>]*)>/g)) {
        for (const [, name, value = ''] of attributeList.matchAll(/\s([^\s=>"'/]+)(?:="([^"]*)")?/g)) {
            if (/^on/i.test(name)) assert.fail(`an event handler attribute reached the markup: ${tag.slice(0, 200)}`);
            if (!URL_ATTRIBUTE.test(name) || value === REACT_BLOCKED_URL) continue;
            // Browsers ignore control characters and whitespace inside a scheme.
            const url = decodeEntities(value).replace(/[\u0000- ]/g, '').toLowerCase();
            const scriptUrl = /^(javascript|vbscript):/.test(url) || (url.startsWith('data:') && !url.startsWith('data:image/'));
            if (scriptUrl) assert.fail(`a script URL reached the markup: ${tag.slice(0, 200)}`);
        }
    }
}

function describeMismatch(expected, actual) {
    let i = 0;
    while (i < expected.length && i < actual.length && expected[i] === actual[i]) i++;
    const from = Math.max(0, i - 120);
    return [
        `first difference at offset ${i} (expected ${expected.length} chars, got ${actual.length})`,
        `expected: …${expected.slice(from, i + 200)}`,
        `actual:   …${actual.slice(from, i + 200)}`,
        UPDATE_HINT,
    ].join('\n');
}

const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
// Plain code-unit order: the pin file must not depend on the machine's locale.
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

if (UPDATE) fs.mkdirSync(GOLDEN_DIR, { recursive: true });

test('the guards catch what they exist for', () => {
    assert.match(attributeProblems('<discord-reply roleColor="#fff">')[0], /roleColor is not an attribute/);
    assert.match(attributeProblems('<discord-reaction count="1.5K">')[0], /reads it as a number/);
    assert.match(attributeProblems('<discord-reply bot="false">')[0], /true by its presence/);
    assert.match(attributeProblems('<discord-system-message type="neutral">')[0], /not one of/);
    assert.match(attributeProblems('<discord-nope>')[0], /not a component/);
    assert.deepEqual(attributeProblems('<discord-reply role-color="#fff" server="" slot="reply" data-goto="1">'), []);
    assert.throws(() => assertScriptsParse('<script>if(</script>'), /does not parse/);
    assert.throws(() => assertScriptsParse('<script id="dht-data" type="application/json">{"a":</script>'), /JSON data island/);
    assert.throws(() => assertNoActiveContent('<img src="x" onerror="alert(1)">'), /event handler/);
    assert.throws(() => assertNoActiveContent('<a href="javascript:alert(1)">x</a>'), /script URL/);
    assert.throws(() => assertNoActiveContent('<a href="java&#x9;script:alert(1)">x</a>'), /script URL/);
    assert.throws(() => assertNoActiveContent('<a href="data:text/html,x">x</a>'), /script URL/);
    assert.throws(() => assertNoActiveContent('<discord-embed author-image="javascript:alert(1)">'), /script URL/);
    assert.throws(() => assertNoActiveContent('<discord-file-attachment href="javascript:alert(1)">'), /script URL/);
    assert.doesNotThrow(() => assertNoActiveContent('<discord-file-attachment href="attachment://invoice.pdf" data-text="javascript: is just text here">'));
    // Escaped text inside a value is data, not markup.
    assert.doesNotThrow(() => assertNoActiveContent('<a href="https://x/&quot;&gt;&lt;svg onload=alert(1)&gt;">x</a>'));
    assert.doesNotThrow(() => assertNoActiveContent(`<a href="${REACT_BLOCKED_URL}">x</a><img src="data:image/png;base64,AA"><script>a.onclick=1</script>`));
});

for (const name of Object.keys(scenarios)) {
    test(`golden: ${name}`, async () => {
        const { html, warnings, errors, expectWarnings } = await renderScenario(name);

        const unexpected = warnings.filter((w) => !expectWarnings.some((re) => re.test(w)));
        assert.deepEqual(unexpected, [], 'the renderer warned unexpectedly');
        for (const re of expectWarnings) assert.ok(warnings.some((w) => re.test(w)), `expected a warning matching ${re}`);
        assert.deepEqual(errors, [], 'the renderer logged an error');
        // Half of a character outside the Basic Multilingual Plane cannot be encoded and
        // turns into U+FFFD; a fixture never contains the replacement character itself.
        assert.ok(!html.includes('\uFFFD'), 'U+FFFD reached the page: a character was cut in half somewhere');
        if (expectWarnings.length === 0) assert.ok(!html.includes('failed to render'), 'a fixture message failed to render');
        assert.deepEqual(attributeProblems(html), [], 'every attribute must reach its component as intended');
        assertScriptsParse(html);
        assertNoActiveContent(html);
        // The checks above read the installed components; the page must load the same version.
        const pinned = html.match(/@skyra\/discord-components-core@([^/"']+)\//)?.[1];
        if (pinned) assert.equal(pinned, INSTALLED_VERSION, 'the page loads other components than the ones checked here');

        const file = path.join(GOLDEN_DIR, `${name}.html`);
        const actual = normalize(html);
        if (UPDATE) {
            fs.writeFileSync(file, actual);
            return;
        }
        assert.ok(fs.existsSync(file), `missing snapshot ${path.relative(process.cwd(), file)} — run: npm run test:update`);
        // A checkout that converted line endings must not fail every snapshot.
        const expected = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
        if (expected !== actual) assert.fail(describeMismatch(expected, actual));
    });
}

test('the static blocks match their pinned content', () => {
    const actual = Object.fromEntries(
        [...STATIC_BLOCKS].map(([value, name]) => [name, sha256(value)]).sort(([a], [b]) => byCodeUnit(a, b)),
    );
    if (UPDATE) {
        fs.writeFileSync(STATIC_PINS, JSON.stringify(actual, null, 2) + '\n');
        return;
    }
    assert.ok(fs.existsSync(STATIC_PINS), 'missing golden/static-blocks.json — run: npm run test:update');
    const pinned = JSON.parse(fs.readFileSync(STATIC_PINS, 'utf8'));
    const changed = Object.keys({ ...pinned, ...actual }).filter((name) => pinned[name] !== actual[name]);
    assert.deepEqual(changed, [], `static blocks changed in dist/static/client.js. ${UPDATE_HINT}`);
});

test('every stored snapshot belongs to a scenario', () => {
    const orphans = fs.readdirSync(GOLDEN_DIR)
        .filter((file) => file.endsWith('.html') && !Object.hasOwn(scenarios, file.slice(0, -'.html'.length)));
    if (UPDATE) {
        for (const file of orphans) fs.rmSync(path.join(GOLDEN_DIR, file));
        return;
    }
    assert.deepEqual(orphans, [], `snapshots without a scenario. ${UPDATE_HINT}`);
});

test('every return type carries the same document', async () => {
    const { generateFromMessages, ExportReturnType } = require('../dist/index.js');
    const { createWorld, at, NOW } = require('./helpers/world');
    const { mock } = require('node:test');
    mock.timers.enable({ apis: ['Date'], now: NOW.getTime() });
    let world = null;
    try {
        world = createWorld();
        const messages = [world.message({ createdAt: at(0, 9, 0), content: 'same everywhere' })];
        const asString = await generateFromMessages(messages, world.channel, { returnType: ExportReturnType.String });
        const asBuffer = await generateFromMessages(messages, world.channel, { returnType: ExportReturnType.Buffer });
        const asAttachment = await generateFromMessages(messages, world.channel, { returnType: ExportReturnType.Attachment, filename: 'custom.html' });
        const asStream = await generateFromMessages(messages, world.channel, { returnType: ExportReturnType.Stream });

        assert.ok(Buffer.isBuffer(asBuffer));
        assert.equal(asBuffer.toString('utf8'), asString);
        assert.equal(asAttachment.name, 'custom.html');
        assert.equal(Buffer.from(asAttachment.attachment).toString('utf8'), asString);
        assert.ok(asStream instanceof Readable);
        const chunks = [];
        for await (const chunk of asStream) chunks.push(Buffer.from(chunk));
        assert.equal(Buffer.concat(chunks).toString('utf8'), asString);
    }
    finally {
        mock.timers.reset();
        await world?.destroy();
    }
});

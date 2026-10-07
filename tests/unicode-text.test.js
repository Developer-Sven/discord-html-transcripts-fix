'use strict';
// Text outside the Basic Multilingual Plane — fancy-font letters ("math italic"
// server names are everywhere on Discord), rare CJK, symbols — is two UTF-16 code
// units. The markdown parser cuts its text nodes at every non-ASCII character, and
// it does so per code unit, so such a character used to arrive as two nodes holding
// one lone half each. Encoded into the page, every half became U+FFFD: a server name
// in a container read as a string of replacement characters instead of its letters.
//
// Every path text takes into the page is checked here, on real discord.js objects.
process.env.TZ = 'UTC';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./helpers/html');
const { at, IDS } = require('./helpers/world');

// FIVEM and COMEBACK in math sans-serif italic, written as escapes so no tool in the
// chain can re-encode them.
const FIVEM = '\u{1D60D}\u{1D610}\u{1D61D}\u{1D60C}\u{1D614}';
const COMEBACK = '\u{1D60A}\u{1D616}\u{1D614}\u{1D60C}\u{1D609}\u{1D608}\u{1D60A}\u{1D612}';
const KANJI = '\u{20BB7}'; // a CJK ideograph outside the BMP
const FAMILY = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'; // a ZWJ emoji sequence

const REPLACEMENT = '\uFFFD';

function assertIntact(html, needle, where) {
    assert.ok(!html.includes(REPLACEMENT), `${where}: U+FFFD reached the page`);
    assert.ok(html.replace(/<!-- -->/g, '').includes(needle), `${where}: ${JSON.stringify(needle)} is missing`);
}

/** One message per path that carries user text; each gets its own check. */
const PATHS = {
    'plain message content': (w) => w.message({ createdAt: at(0, 9, 0), content: 'Support ' + FIVEM + ' and ' + KANJI }),
    'bold, italic, underline, strike': (w) => w.message({ createdAt: at(0, 9, 1), content: '**' + FIVEM + '** *' + FIVEM + '* __' + FIVEM + '__ ~~' + FIVEM + '~~' }),
    'spoiler': (w) => w.message({ createdAt: at(0, 9, 2), content: '||' + FIVEM + '||' }),
    'block quote': (w) => w.message({ createdAt: at(0, 9, 3), content: '> ' + FIVEM }),
    'heading and subtext': (w) => w.message({ createdAt: at(0, 9, 4), content: '# ' + FIVEM + '\n-# ' + COMEBACK }),
    'inline code and code block': (w) => w.message({ createdAt: at(0, 9, 5), content: '`' + FIVEM + '`\n```\n' + COMEBACK + '\n```' }),
    'link text': (w) => w.message({ createdAt: at(0, 9, 6), content: '[' + FIVEM + '](https://example.com/)' }),
    'list': (w) => w.message({ createdAt: at(0, 9, 7), content: '- ' + FIVEM + '\n- ' + COMEBACK }),
    'emoji sequences': (w) => w.message({ createdAt: at(0, 9, 8), content: FAMILY + ' ' + FIVEM }),
    'embed': (w) => w.message({
        createdAt: at(0, 9, 9),
        embeds: [{ type: 'rich', title: FIVEM, description: 'D ' + FIVEM, author: { name: 'A ' + FIVEM }, fields: [{ name: 'F ' + FIVEM, value: 'V ' + FIVEM, inline: false }], footer: { text: 'Foot ' + FIVEM } }],
    }),
    'Components V2 container': (w) => w.message({
        createdAt: at(0, 9, 10),
        flags: 1 << 15,
        authorKey: 'bot',
        components: [{ type: 17, components: [{ type: 10, content: 'Support \u2022 ' + FIVEM + ' | ' + COMEBACK }] }],
    }),
    'Components V2 section': (w) => w.message({
        createdAt: at(0, 9, 11),
        flags: 1 << 15,
        authorKey: 'bot',
        components: [{ type: 9, components: [{ type: 10, content: 'Section ' + FIVEM }], accessory: { type: 11, media: { url: 'https://cdn.discordapp.com/x.png' } } }],
    }),
    'button and select menu': (w) => w.message({
        createdAt: at(0, 9, 12),
        authorKey: 'bot',
        components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Btn ' + FIVEM, custom_id: 'a' }, { type: 3, custom_id: 's', placeholder: 'Ph ' + FIVEM, options: [{ label: 'Opt ' + FIVEM, value: 'o' }] }] }],
    }),
    'attachment name': (w) => w.message({
        createdAt: at(0, 9, 13),
        attachments: [{ id: '1100000000000070401', filename: FIVEM + '.txt', size: 10, url: 'https://cdn.discordapp.com/attachments/1/2/x.txt', proxy_url: 'https://media.discordapp.net/attachments/1/2/x.txt', content_type: 'text/plain' }],
    }),
    'poll': (w) => w.message({
        createdAt: at(0, 9, 14),
        poll: { question: { text: 'Q ' + FIVEM }, answers: [{ answer_id: 1, poll_media: { text: 'A ' + FIVEM } }], expiry: at(-1, 9, 0).toISOString(), allow_multiselect: false, layout_type: 1 },
    }),
    'forwarded message': (w) => w.message({
        createdAt: at(0, 9, 15),
        content: '',
        flags: 1 << 14,
        message_reference: { type: 1, message_id: '1100000000000088901', channel_id: IDS.otherChannel, guild_id: IDS.guild },
        message_snapshots: [{ message: { content: 'Fwd ' + FIVEM, embeds: [], attachments: [], timestamp: at(5, 8, 0).toISOString(), edited_timestamp: null, flags: 0, mentions: [], mention_roles: [], type: 0, components: [], sticker_items: [] } }],
    }),
    'neutral system message': (w) => w.message({ createdAt: at(0, 9, 16), type: 999, content: 'Sys ' + FIVEM }),
};

for (const [name, make] of Object.entries(PATHS)) {
    test('astral text survives: ' + name, async (t) => {
        const { html } = await render(t, (w) => [make(w)]);
        assertIntact(html, FIVEM.slice(0, 2), name);
        // The text, whole and in order — not just its first character.
        const whole = name === 'emoji sequences' ? FAMILY : FIVEM;
        assertIntact(html, whole, name);
    });
}

test('astral text survives in a reply preview, including where it is cut', async (t) => {
    const prefix = 'a'.repeat(179);
    const { html } = await render(t, (w) => {
        // The 180th code unit of this text is the first half of an astral character.
        const cutInside = w.message({ createdAt: at(0, 9, 20), content: prefix + FIVEM });
        const whole = w.message({ createdAt: at(0, 9, 21), authorKey: 'bob', content: 'Reply ' + FIVEM });
        const reply = (minute, target, text) => w.message({
            createdAt: at(0, 9, minute),
            type: 19,
            content: text,
            message_reference: { type: 0, message_id: target.id, channel_id: IDS.channel, guild_id: IDS.guild },
        });
        return [cutInside, whole, reply(22, cutInside, 'to the long one'), reply(23, whole, 'to the short one')];
    });
    assert.ok(!html.includes(REPLACEMENT), 'U+FFFD reached the page');
    assert.ok(html.replace(/<!-- -->/g, '').includes('Reply ' + FIVEM), 'the short preview keeps its text');
    assert.ok(html.includes(prefix + '...'), 'the long preview is cut before the astral character, not through it');
});

test('astral text survives in a thread preview and a party id, where they are cut', async (t) => {
    const { html } = await render(t, (w) => {
        const thread = w.client.channels._add({
            id: IDS.thread,
            type: 11,
            guild_id: IDS.guild,
            parent_id: IDS.channel,
            owner_id: IDS.alice,
            name: 'Support thread',
            message_count: 2,
            member_count: 2,
            last_message_id: null,
            thread_metadata: { archived: false, auto_archive_duration: 60, archive_timestamp: at(0, 9, 0).toISOString(), locked: false },
        }, w.guild);
        // The preview is cut after 125 code units: the 125th is the first half of an astral character.
        const last = w.message({ createdAt: at(0, 9, 30), authorKey: 'bob', content: 'a'.repeat(124) + FIVEM + ' ' + 'tail '.repeat(10) }, thread);
        thread.lastMessageId = last.id;
        return [
            w.message({ id: IDS.thread, createdAt: at(0, 9, 29), content: 'starts a thread', flags: 1 << 5, thread: { id: IDS.thread, type: 11, guild_id: IDS.guild, parent_id: IDS.channel, name: thread.name, message_count: 2, thread_metadata: { archived: false, locked: false, auto_archive_duration: 60, archive_timestamp: at(0, 9, 0).toISOString() } } }),
            // application_id and a party id that ends inside a pair
            w.message({ createdAt: at(0, 9, 31), content: 'join', activity: { type: 1, party_id: 'x' + FIVEM + 'yz' }, application_id: IDS.application }),
        ];
    });
    assert.ok(!html.includes(REPLACEMENT), 'U+FFFD reached the page');
    assert.ok(html.includes('a'.repeat(124) + '...'), 'the preview ends before the astral character, not inside it');
});

test('markdown syntax around astral text never breaks it apart', async (t) => {
    // Delimiters, escapes, mentions and links mixed with fancy-font letters, in a seeded
    // order: whatever the parser makes of them, no half of a character may reach the page.
    const TOKENS = ['*', '**', '_', '__', '~~', '||', '`', '```', '> ', '# ', '-# ', '- ', '\n', ' ', '[x](https://example.com/)', 'https://example.com/a', '<@' + IDS.alice + '>', '<#' + IDS.channel + '>', '\\*', FIVEM, COMEBACK, KANJI, 'word', '\u00E9'];
    let seed = 7;
    const random = () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let x = seed;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const texts = Array.from({ length: 200 }, () => Array.from({ length: 2 + Math.floor(random() * 10) }, () => TOKENS[Math.floor(random() * TOKENS.length)]).join(''));
    const { html } = await render(t, (w) => texts.map((text, i) => w.message({ createdAt: new Date(at(0, 0, 0).getTime() + i * 1000), content: text })));
    assert.ok(!html.includes(REPLACEMENT), 'U+FFFD reached the page');
});

test('astral text survives where a message is searched', async (t) => {
    const { html } = await render(t, (w) => [w.message({ createdAt: at(0, 9, 24), content: 'x'.repeat(4095) + FIVEM })]);
    assert.ok(!html.includes(REPLACEMENT), 'the search text was cut through an astral character');
});

test('any plain text comes out exactly as it went in', async (t) => {
    // Letters from every script this bug touches, no markdown syntax and no emoji (those
    // become images). A seeded generator keeps a failure reproducible.
    const ALPHABET = [
        ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        ...'\u00E9\u00FC\u00DF\u00E7\u00F1\u0141', // accented Latin
        ...'\u65E5\u672C\u8A9E\u4E2D\u6587', // CJK in the BMP
        ...'\u05E9\u05DC\u05D5\u05DD\u0645\u0631\u062D\u0628\u0627', // Hebrew and Arabic
        '\u{1D608}', '\u{1D610}', '\u{1D61D}', '\u{1D60C}', '\u{1D614}', '\u{1D5D4}', '\u{1D7D8}', // fancy-font letters and digits
        '\u{20BB7}', '\u{2070E}', '\u{1F700}', '\u{10400}', // ideographs, an alchemical symbol, a Deseret letter
    ];
    let seed = 20261007;
    const random = () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let x = seed;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (list) => list[Math.floor(random() * list.length)];
    const word = () => Array.from({ length: 1 + Math.floor(random() * 7) }, () => pick(ALPHABET)).join('');
    const texts = Array.from({ length: 150 }, () => Array.from({ length: 1 + Math.floor(random() * 6) }, word).join(' '));

    const { html, body } = await render(t, (w) => texts.map((text, i) => w.message({ createdAt: new Date(at(0, 0, 0).getTime() + i * 1000), content: text })));
    assert.ok(!html.includes(REPLACEMENT), 'U+FFFD reached the page');
    const decode = (s) => s.replace(/&(amp|lt|gt|quot|#x27);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'" })[name]);
    const rendered = [...body.matchAll(/<discord-message id="m-[^"]*"[^>]*>([\s\S]*?)<\/discord-message>/g)].map(([, inner]) => decode(inner));
    assert.equal(rendered.length, texts.length);
    for (let i = 0; i < texts.length; i++) assert.equal(rendered[i], texts[i], `message ${i}`);
});

test('markdown text is one node per run, not one per non-ASCII character', async (t) => {
    const { html } = await render(t, (w) => [w.message({ createdAt: at(0, 9, 25), content: 'caf\u00E9 na\u00EFve ' + KANJI + ' \u00FCber' })]);
    assert.ok(html.includes('caf\u00E9 na\u00EFve ' + KANJI + ' \u00FCber'), 'adjacent text is rendered as one piece');
    assert.ok(!/caf<!-- -->\u00E9/.test(html), 'no separator is left between the pieces of one word');
});

test('the server initials come from whole characters, never from half of one', async (t) => {
    const named = async (name) => {
        const { body } = await render(t, (w) => {
            w.guild.name = name;
            return [w.message({ createdAt: at(0, 9, 26), content: 'x' })];
        });
        return body.match(/<div class="discord-header-icon"><div><span>([^<]*)<\/span>/)?.[1];
    };
    assert.equal(await named(FIVEM + ' ' + COMEBACK + ' 2026'), '\u{1D60D}\u{1D60A}');
    assert.equal(await named('Fixture Guild'), 'FG');
    assert.equal(await named('One'), 'O');
    assert.equal(await named('Guild  Spaced'), 'GS', 'a double space is no word');
    assert.equal(await named('e\u0301cole nouvelle'), 'e\u0301n', 'an accent stays with its letter');
    assert.equal(await named(FAMILY + ' family'), FAMILY + 'f', 'an emoji sequence stays whole');
    assert.equal(await named('  '), '', 'no words, no initials — and no "undefined"');
});

test('a server without an icon shows its name intact in the header', async (t) => {
    const { body } = await render(t, (w) => {
        w.guild.name = FIVEM + ' ' + COMEBACK + ' 2026';
        w.channel.name = '\u{1F3AB}\u2503support-129';
        return [w.message({ createdAt: at(0, 9, 27), content: 'x' })];
    });
    assert.ok(!body.includes(REPLACEMENT));
    assert.match(body, new RegExp('<div class="discord-header-text-guild">' + FIVEM + ' ' + COMEBACK + ' 2026</div>'));
});

'use strict';
// The renderer receives discord.js structures, not raw API JSON. Several branches
// were written against the raw shape — snake_case fields, plain arrays — and were
// therefore dead in production: discord.js renames fields to camelCase, exposes
// collections as Collection, and keeps some raw values only under `.data`.
//
// These tests build REAL discord.js objects from API payloads (helpers/world.js)
// so that class of mistake cannot hide behind a hand-written fake again. Only the
// tests about plain-object input — which the public API accepts too — use fakes.
process.env.TZ = 'UTC';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateFromMessages, ExportReturnType } = require('../dist/index.js');
const { isForwardReference, isForwardMessage } = require('../dist/utils/utils.js');
const { MessageReferenceType } = require('discord.js');
const { createWorld, at, IDS } = require('./helpers/world');

/**
 * Renders what `build` returns. `html` is the whole document, including the data
 * island in <head> that feeds the profile cards. `body` is the visible page without
 * React's `<!-- -->` text separators, which are a detail of the renderer, not output.
 */
async function render(t, build, options = {}) {
    const world = createWorld();
    t.after(() => world.destroy());
    const html = await generateFromMessages(build(world), world.channel, { returnType: ExportReturnType.String, ...options });
    assert.ok(!html.includes('failed to render'), 'a fixture message failed to render');
    const body = html.slice(html.indexOf('<body')).replace(/<!-- -->/g, '');
    const data = JSON.parse(html.match(/<script id="dht-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
    return { html, body, data };
}

/** The attributes of every `<tag>` in `html`, in document order; names lowercased as HTML parses them. */
function tags(html, tag) {
    return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(([, list]) => new Map(
        [...list.matchAll(/\s([^\s=>"'/]+)(?:="([^"]*)")?/g)].map(([, name, value = '']) => [name.toLowerCase(), value]),
    ));
}

const forwardSnapshot = {
    content: 'FORWARDED **body**',
    embeds: [],
    attachments: [{
        id: '1100000000000077777',
        filename: 'fwd.png',
        size: 10,
        url: 'https://cdn.discordapp.com/attachments/1/2/fwd.png',
        proxy_url: 'https://media.discordapp.net/attachments/1/2/fwd.png',
        content_type: 'image/png',
        width: 8,
        height: 8,
    }],
    timestamp: at(5, 8, 0).toISOString(),
    edited_timestamp: null,
    flags: 0,
    mentions: [],
    mention_roles: [],
    type: 0,
    components: [],
    sticker_items: [],
};

/** A message payload as Discord sends it, for messages the bot has cached. */
function rawMessage(id, channelId, guildId, author, content) {
    return {
        id, channel_id: channelId, guild_id: guildId, author, content,
        timestamp: at(5, 8, 0).toISOString(), edited_timestamp: null, tts: false, mention_everyone: false,
        mentions: [], mention_roles: [], attachments: [], embeds: [], pinned: false, type: 0, flags: 0, components: [],
    };
}

const FOREIGN_CHANNEL = '1100000000000000901';
const FOREIGN_USER = { id: '1100000000000000555', username: 'foreign-user', global_name: 'Foreign Person', discriminator: '0', avatar: null, bot: false };

/** Adds a second server the bot is in, with a channel whose name must never leak. */
function addForeignGuild(w) {
    const guild = w.client.guilds._add({
        id: IDS.otherGuild,
        name: 'Other Server',
        icon: null,
        owner_id: FOREIGN_USER.id,
        roles: [{ id: IDS.otherGuild, name: '@everyone', color: 0, colors: { primary_color: 0, secondary_color: null, tertiary_color: null }, position: 0, permissions: '0', hoist: false, managed: false, mentionable: false, flags: 0 }],
        emojis: [],
        stickers: [],
        features: [],
        channels: [],
        members: [],
        premium_tier: 0,
        preferred_locale: 'en-US',
    });
    return w.client.channels._add({
        id: FOREIGN_CHANNEL,
        type: 0,
        guild_id: IDS.otherGuild,
        name: 'secret-plans',
        position: 0,
        permission_overwrites: [],
    }, guild);
}

// --- embeds ------------------------------------------------------------------------

test('a GIF link preview (gifv) renders as a looping video, not an empty rich embed', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 0),
        content: 'https://tenor.com/view/x',
        embeds: [{
            type: 'gifv',
            url: 'https://tenor.com/view/x',
            provider: { name: 'Tenor', url: 'https://tenor.co' },
            thumbnail: { url: 'https://media.tenor.com/x.png', proxy_url: 'https://images-ext-1.discordapp.net/x.png', width: 200, height: 200 },
            video: { url: 'https://media.tenor.com/x.mp4', proxy_url: 'https://images-ext-1.discordapp.net/x.mp4', width: 200, height: 200 },
        }],
    })]);
    assert.match(body, /<div class="dht-embed dht-embed--gifv"><video\b/);
    const [video] = tags(body, 'video');
    assert.equal(video.get('src'), 'https://images-ext-1.discordapp.net/x.mp4');
    for (const flag of ['autoplay', 'loop', 'muted']) assert.ok(video.has(flag), `the GIF video needs ${flag}`);
});

test('an image link preview renders its picture, which Discord sends as the thumbnail', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 1),
        content: 'https://example.com/pic.png',
        embeds: [{
            type: 'image',
            url: 'https://example.com/pic.png',
            thumbnail: { url: 'https://example.com/pic.png', proxy_url: 'https://images-ext-1.discordapp.net/pic.png', width: 300, height: 200 },
        }],
    })]);
    assert.match(body, /<div class="dht-embed dht-embed--image">/);
    assert.ok(tags(body, 'img').some((img) => img.get('class') === 'dht-embed-image' && img.get('src') === 'https://images-ext-1.discordapp.net/pic.png'));
});

test('a video embed shows its preview image under the play overlay', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 2),
        content: 'https://youtu.be/abc',
        embeds: [{
            type: 'video',
            url: 'https://www.youtube.com/watch?v=abc',
            title: 'A video',
            provider: { name: 'YouTube' },
            thumbnail: { url: 'https://i.ytimg.com/vi/abc/hq.jpg', proxy_url: 'https://images-ext-1.discordapp.net/hq.jpg', width: 480, height: 360 },
            video: { url: 'https://www.youtube.com/embed/abc', width: 1280, height: 720 },
        }],
    })]);
    assert.match(body, /<div class="dht-embed dht-embed--video">/);
    assert.ok(tags(body, 'img').some((img) => img.get('class') === 'dht-embed-video-thumb' && img.get('src') === 'https://images-ext-1.discordapp.net/hq.jpg'));
    assert.match(body, /class="dht-embed-video-play"/);
});

test('a rich embed keeps the rich layout and does not promote its thumbnail', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 3),
        embeds: [{
            type: 'rich',
            title: 'Rich',
            description: 'text',
            thumbnail: { url: 'https://example.com/small.png', proxy_url: 'https://images-ext-1.discordapp.net/small.png', width: 80, height: 80 },
        }],
    })]);
    assert.doesNotMatch(body, /dht-embed--(image|gifv|video)/);
    assert.doesNotMatch(body, /class="dht-embed-image"/);
    const [embed] = tags(body, 'discord-embed');
    assert.equal(embed.has('image'), false, 'the thumbnail must not become the large image');
    assert.equal(embed.get('thumbnail'), 'https://images-ext-1.discordapp.net/small.png');
});

test('a GIF preview without a video falls back to a card that shows its picture once', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 4),
        embeds: [{
            type: 'gifv',
            url: 'https://tenor.com/view/y',
            thumbnail: { url: 'https://media.tenor.com/y.png', proxy_url: 'https://images-ext-1.discordapp.net/y.png', width: 200, height: 200 },
        }],
    })]);
    const [embed] = tags(body, 'discord-embed');
    assert.equal(embed.get('thumbnail'), 'https://images-ext-1.discordapp.net/y.png');
    assert.equal(embed.has('image'), false);
});

// --- forwards ----------------------------------------------------------------------

test('isForwardReference and isForwardMessage recognise forwards only', () => {
    if (MessageReferenceType) assert.equal(MessageReferenceType.Forward, 1, 'the API value the helper spells out');
    assert.equal(isForwardReference({ type: 1, messageId: '1' }), true);
    assert.equal(isForwardReference({ type: 0, messageId: '1' }), false);
    assert.equal(isForwardReference({ messageId: '1' }), false);
    assert.equal(isForwardReference(null), false);
    // discord.js before 14.16 drops the reference type; the HasSnapshot flag remains.
    assert.equal(isForwardMessage({ reference: { messageId: '1' }, flags: { bitfield: 1 << 14 } }), true);
    assert.equal(isForwardMessage({ reference: { messageId: '1' }, flags: 1 << 14 }), true);
    assert.equal(isForwardMessage({ reference: { type: 1, messageId: '1' }, flags: 0 }), true);
    assert.equal(isForwardMessage({ reference: { type: 0, messageId: '1' }, flags: { bitfield: 1 << 2 } }), false);
    assert.equal(isForwardMessage(null), false);
});

test('a forward renders its content and names the source channel of this server', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 5),
        content: '',
        flags: 1 << 14,
        message_reference: { type: 1, message_id: '1100000000000088888', channel_id: IDS.otherChannel, guild_id: IDS.guild },
        message_snapshots: [{ message: forwardSnapshot }],
    })]);
    assert.ok(!body.includes('Message could not be loaded'), 'the forward must not render as an empty message');
    assert.match(body, /<div class="dht-forwarded-wrap">/);
    assert.match(body, /<span data-i18n="forwardedFrom">Forwarded from<\/span><strong> #general<\/strong>/);
    assert.match(body, /FORWARDED <strong>body/);
    assert.match(body, /fwd\.png/);
});

test('a forwarded image is archived like any other with saveImages or a custom resolver', async (t) => {
    const archived = 'data:image/png;base64,QVJDSElWRUQ=';
    const seen = [];
    const { body, data } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 33),
        content: '',
        flags: 1 << 14,
        message_reference: { type: 1, message_id: '1100000000000088810', channel_id: IDS.otherChannel, guild_id: IDS.guild },
        message_snapshots: [{ message: forwardSnapshot }],
    })], { callbacks: { resolveImageSrc: async (attachment) => { seen.push(attachment.name); return archived; } } });
    assert.deepEqual(seen, ['fwd.png'], 'the forwarded attachment went through the resolver');
    assert.ok(tags(body, 'img').some((img) => img.get('src') === archived));
    assert.equal(tags(body, 'img').some((img) => img.get('src')?.includes('/fwd.png')), false, 'no hot-linked copy is left');
    assert.equal(data.stats.imageCount, 1, 'the stats footer counts it');
    const [message] = tags(body, 'discord-message');
    assert.equal(message.get('data-has-image'), 'true', 'the image filter finds it');
});

test('a forwarded embed, its components and its media count like the message\'s own', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 34),
        content: '',
        flags: 1 << 14,
        message_reference: { type: 1, message_id: '1100000000000088811', channel_id: IDS.otherChannel, guild_id: IDS.guild },
        message_snapshots: [{
            message: {
                ...forwardSnapshot,
                content: '',
                attachments: [],
                flags: 1 << 15,
                embeds: [{ type: 'rich', title: 'Ticket closed', description: 'Closed by **staff**', fields: [{ name: 'Reason', value: 'solved', inline: false }] }],
                components: [{ type: 17, components: [{ type: 10, content: 'Components V2 body' }] }],
            },
        }],
    })]);
    const [embed] = tags(body, 'discord-embed');
    assert.equal(embed.get('embed-title'), 'Ticket closed');
    assert.match(body, /Closed by <strong>staff/);
    assert.match(body, /Reason/);
    assert.doesNotMatch(body, /dht-forwarded-embeds/, 'not just a "1 embed" count');
    assert.match(body, /Components V2 body/);
    const [message] = tags(body, 'discord-message');
    assert.equal(message.get('data-has-embed'), 'true');
    assert.equal(message.get('data-has-component-v2'), 'true');
});

test('a forward never names the original author, even when the bot has the original cached', async (t) => {
    // discord.js builds a snapshot in the source channel's message cache. With the
    // original cached, the "snapshot" is that original message, author included.
    const { body, data } = await render(t, (w) => {
        const source = w.client.channels.cache.get(IDS.otherChannel);
        source.messages._add(rawMessage('1100000000000088889', IDS.otherChannel, IDS.guild, w.users.bob, 'the original'));
        return [w.message({
            createdAt: at(0, 9, 6),
            content: '',
            flags: 1 << 14,
            message_reference: { type: 1, message_id: '1100000000000088889', channel_id: IDS.otherChannel, guild_id: IDS.guild },
            message_snapshots: [{ message: forwardSnapshot }],
        })];
    });
    assert.match(body, /<span data-i18n="forwardedFrom">Forwarded from<\/span><strong> #general<\/strong>/);
    assert.equal(data.profiles[IDS.bob], undefined, 'the hidden author must not get a profile card');
});

test('a forward from another server leaks nothing about that server', async (t) => {
    const { html, body, data } = await render(t, (w) => {
        const foreign = addForeignGuild(w);
        // The bot also sees the original — the state a bot in several servers is in.
        foreign.messages._add(rawMessage('1100000000000088801', FOREIGN_CHANNEL, IDS.otherGuild, FOREIGN_USER, 'the original'));
        const forward = w.message({
            createdAt: at(0, 9, 7),
            content: '',
            flags: 1 << 14,
            message_reference: { type: 1, message_id: '1100000000000088801', channel_id: FOREIGN_CHANNEL, guild_id: IDS.otherGuild },
            message_snapshots: [{ message: forwardSnapshot }],
        });
        return [forward, w.message({
            createdAt: at(0, 9, 8),
            authorKey: 'bob',
            type: 19,
            content: 'reply to the forward',
            message_reference: { type: 0, message_id: forward.id, channel_id: IDS.channel, guild_id: IDS.guild },
        })];
    });
    // The whole document, profile data included — not only what is visible.
    for (const secret of ['secret-plans', 'foreign-user', 'Foreign Person', 'Other Server', FOREIGN_USER.id, FOREIGN_CHANNEL]) {
        assert.ok(!html.includes(secret), `"${secret}" from another server leaked into the transcript`);
    }
    assert.deepEqual(Object.keys(data.users).sort(), [IDS.alice, IDS.bob].sort());
    // No source is known, so the header only says what the message is.
    assert.match(body, /<span data-i18n="forwardedMessage">Forwarded<\/span><\/div>/);
    assert.ok(!body.includes('Forwarded from'), 'nothing may claim a source');
    const [forwardTag] = tags(body, 'discord-message');
    assert.equal(forwardTag.has('server'), false, 'a forward is no cross-server reply');
    const [replyTag] = tags(body, 'discord-reply');
    assert.equal(replyTag.has('server'), false, 'replying to a forward is no cross-post');
});

test('a forward whose snapshot is missing still says it is a forward', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 9),
        content: '',
        flags: 1 << 14,
        message_reference: { type: 1, message_id: '1100000000000088802', channel_id: IDS.otherChannel, guild_id: IDS.guild },
    })]);
    assert.match(body, /<em data-i18n="forwardUnavailable">Forwarded message is unavailable<\/em>/);
    assert.ok(!body.includes('Message could not be loaded'), 'a forward is not a reply to an unknown message');
});

test('a forward from discord.js before 14.16 is still recognised by its flag', async (t) => {
    const { body } = await render(t, (w) => {
        const forward = w.message({
            createdAt: at(0, 9, 10),
            content: '',
            flags: 1 << 14,
            message_reference: { message_id: '1100000000000088803', channel_id: IDS.otherChannel, guild_id: IDS.guild },
        });
        // What those versions hand over: no reference type and no snapshots.
        delete forward.reference.type;
        delete forward.messageSnapshots;
        return [forward, w.message({
            createdAt: at(0, 9, 11),
            authorKey: 'bob',
            type: 19,
            content: 'about that forward',
            message_reference: { type: 0, message_id: forward.id, channel_id: IDS.channel, guild_id: IDS.guild },
        })];
    });
    assert.ok(!body.includes('Message could not be loaded'), 'a forward got the reply bar of an unknown message');
    assert.match(body, /Forwarded message is unavailable/);
    assert.match(body, /Click to see forwarded message\./);
});

test('a reply to a forwarded message gets the forward placeholder', async (t) => {
    const { body } = await render(t, (w) => {
        const forward = w.message({
            createdAt: at(0, 9, 12),
            content: '',
            flags: 1 << 14,
            message_reference: { type: 1, message_id: '1100000000000088888', channel_id: IDS.otherChannel, guild_id: IDS.guild },
            message_snapshots: [{ message: forwardSnapshot }],
        });
        return [forward, w.message({
            createdAt: at(0, 9, 13),
            type: 19,
            content: 'about that forward',
            message_reference: { type: 0, message_id: forward.id, channel_id: IDS.channel, guild_id: IDS.guild },
        })];
    });
    assert.match(body, /Click to see forwarded message\./);
});

// --- plain-object input --------------------------------------------------------------

test('a plain-object snapshot that names its author shows it and gets a profile', async (t) => {
    const carol = { id: '1100000000000000777', username: 'carol', displayName: 'Carol', bot: false };
    const { body, data } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 14),
        content: '',
        message_reference: { type: 1, message_id: '1100000000000088804', channel_id: IDS.otherChannel, guild_id: IDS.guild },
        extra: { messageSnapshots: [{ message: { author: carol, content: 'plain snapshot body' } }] },
    })]);
    // The caller supplied the author on purpose; it wins over the source channel.
    assert.match(body, /Forwarded from<\/span><strong> Carol<\/strong>/);
    assert.match(body, /plain snapshot body/);
    assert.equal(data.profiles[carol.id]?.author, 'Carol', 'the forwarded author has a profile card');
    assert.equal(data.users[carol.id]?.username, 'carol');
});

test('a member first seen in a forward keeps nickname and role color from their own messages', async (t) => {
    const { data } = await render(t, (w) => [
        w.message({
            createdAt: at(0, 9, 15),
            authorKey: 'bob',
            content: '',
            message_reference: { type: 1, message_id: '1100000000000088805', channel_id: IDS.otherChannel, guild_id: IDS.guild },
            extra: { messageSnapshots: [{ message: { author: { id: IDS.alice, username: 'alice', displayName: 'Alice' }, content: 'quoted' } }] },
        }),
        w.message({ createdAt: at(0, 9, 16), content: 'alice herself' }),
    ]);
    assert.equal(data.profiles[IDS.alice].author, 'Ally', 'the nickname from the guild member');
    assert.equal(data.profiles[IDS.alice].roleColor, '#3498db');
    assert.ok(data.users[IDS.alice].roles.length > 0);
});

test('one malformed plain-object author costs only its own profile', async (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const broken = { id: '1100000000000000778', username: 'mallory', get bot() { throw new Error('broken user'); } };
    const odd = { id: '1100000000000000779', username: 'dora', createdAt: 'not a date' };
    // What User#toJSON() produces: the avatar method became the URL itself.
    const serialised = { id: '1100000000000000780', username: 'eve', displayAvatarURL: 'https://cdn.discordapp.com/embed/avatars/3.png' };
    const { data } = await render(t, (w) => [
        w.message({
            createdAt: at(0, 9, 17),
            content: '',
            message_reference: { type: 1, message_id: '1100000000000088806', channel_id: IDS.otherChannel, guild_id: IDS.guild },
            extra: { messageSnapshots: [broken, odd, serialised].map((author) => ({ message: { author, content: author.username } })) },
        }),
        w.message({ createdAt: at(0, 9, 18), authorKey: 'bob', content: 'still here' }),
    ]);
    assert.ok(data.profiles[IDS.alice] && data.profiles[IDS.bob], 'the other profiles survive');
    assert.equal(data.users[broken.id], undefined);
    assert.ok(warn.mock.calls.some((call) => call.arguments.join(' ').includes(broken.id)), 'the skipped user is reported');
    assert.equal(data.users[odd.id]?.createdAt, null, 'an unparseable date is dropped, not fatal');
    assert.equal(data.profiles[serialised.id]?.avatar, serialised.displayAvatarURL);
});

test('a guild member that cannot be read still leaves a profile built from the user', async (t) => {
    const { buildAllContext } = require('../dist/utils/buildProfiles.js');
    const warn = t.mock.method(console, 'warn', () => {});
    const author = { id: IDS.alice, username: 'alice', displayName: 'Alice', bot: false };
    // discord.js' role getters throw like this when the @everyone role is not cached.
    const member = { nickname: 'Ally', get roles() { throw new TypeError("Cannot read properties of undefined (reading 'id')"); } };
    const { profiles } = await buildAllContext([{ id: '1', author, member }], null);
    assert.equal(profiles[IDS.alice]?.author, 'Alice');
    assert.equal(warn.mock.callCount(), 1);
});

test('one malformed message costs only its own profile entries', async (t) => {
    const { buildAllContext } = require('../dist/utils/buildProfiles.js');
    const warn = t.mock.method(console, 'warn', () => {});
    const alice = { id: IDS.alice, username: 'alice' };
    const bob = { id: IDS.bob, username: 'bob' };
    const { profiles } = await buildAllContext([
        { id: 'broken', author: alice, mentions: { users: 42 } },
        { id: 'fine', author: bob },
    ], null);
    assert.ok(profiles[IDS.alice] && profiles[IDS.bob]);
    assert.ok(warn.mock.calls.some((call) => call.arguments.includes('broken')), 'the message is reported');
});

// --- reactions, voice, components ------------------------------------------------------

test('a super reaction is marked as one, with its color', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 19),
        content: 'super',
        reactions: [{
            count: 2,
            count_details: { burst: 1, normal: 1 },
            me: false,
            me_burst: false,
            burst_colors: ['#ff8800'],
            emoji: { id: null, name: '\u{1F389}' },
        }],
    })]);
    const [reaction] = tags(body, 'discord-reaction');
    assert.equal(reaction.get('title'), '2 reactions (1 super)');
    assert.equal(reaction.get('data-burst'), 'true');
    assert.match(reaction.get('style'), /box-shadow:inset 0 0 0 2px #ff8800/);
});

test('large reaction counts reach the component as numbers', async (t) => {
    const reaction = (count, name) => ({ count, count_details: { burst: 0, normal: count }, me: false, me_burst: false, burst_colors: [], emoji: { id: null, name } });
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 32),
        content: 'popular',
        reactions: [reaction(1500, '\u{1F525}'), reaction(2500000, '\u{1F680}')],
    })]);
    // The component parses `count` with Number(): "1.5K" would render as NaN.
    assert.deepEqual(tags(body, 'discord-reaction').map((r) => r.get('count')), ['1500', '2500000']);
});

test('the stats footer counts one of something in the singular', async (t) => {
    const oneOfEach = (w) => [w.message({
        createdAt: at(0, 9, 35),
        content: 'just me',
        attachments: [{ id: '1100000000000070201', filename: 'a.png', size: 10, url: 'https://cdn.discordapp.com/attachments/1/2/a.png', proxy_url: 'https://media.discordapp.net/attachments/1/2/a.png', content_type: 'image/png', width: 8, height: 8 }],
    })];
    const english = await render(t, oneOfEach);
    assert.match(english.body, /<footer class="dht-stats">1 message · 1 participant · 1 image · /);
    const german = await render(t, oneOfEach, { language: 'de' });
    assert.match(german.body, /<footer class="dht-stats">1 Nachricht · 1 Teilnehmer · 1 Bild · /);
    const two = await render(t, (w) => [...oneOfEach(w), w.message({ createdAt: at(0, 9, 36), authorKey: 'bob', content: 'me too' })]);
    assert.match(two.body, /<footer class="dht-stats">2 messages · 2 participants · 1 image · /);
});

test('a voice message shows its duration', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 20),
        flags: 1 << 13,
        attachments: [{
            id: '1100000000000070007',
            filename: 'voice-message.ogg',
            size: 1,
            url: 'https://cdn.discordapp.com/attachments/1/2/voice-message.ogg',
            proxy_url: 'https://media.discordapp.net/attachments/1/2/voice-message.ogg',
            content_type: 'audio/ogg',
            duration_secs: 7.4,
            waveform: 'AAAAGhoaGhpERERE',
            flags: 1 << 13,
        }],
    })]);
    assert.match(body, /<span class="dht-voice-dur">7s<\/span>/);
});

test('select menu options show their emoji as an image, not as URL text', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 21),
        authorKey: 'bot',
        content: 'Pick a topic',
        components: [{
            type: 1,
            components: [{
                type: 3,
                custom_id: 'topic',
                placeholder: 'Choose',
                options: [
                    { label: 'Billing', value: 'b', emoji: { name: '\u{1F4B3}' } },
                    { label: 'Custom', value: 'c', emoji: { id: IDS.customEmoji, name: 'blobwave', animated: false } },
                ],
            }],
        }],
    })]);
    const images = tags(body, 'img');
    assert.ok(images.some((img) => img.get('src') === 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4b3.svg' && img.get('alt') === '\u{1F4B3}'));
    assert.ok(images.some((img) => img.get('src') === `https://cdn.discordapp.com/emojis/${IDS.customEmoji}.png` && img.get('alt') === 'blobwave'));
    // The URL must never be the visible text of the option.
    assert.doesNotMatch(body, /<span[^>]*>https:\/\/cdnjs\.cloudflare\.com[^<]*<\/span>/);
});

test('a select menu option whose emoji has neither id nor name renders no broken image', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 22),
        authorKey: 'bot',
        content: 'Pick one',
        components: [{
            type: 1,
            components: [{
                type: 3,
                custom_id: 'pick',
                options: [{ label: 'Plain option', value: 'p', emoji: {} }],
            }],
        }],
    })]);
    assert.match(body, /<span>Plain option<\/span>/);
    assert.equal(tags(body, 'img').some((img) => img.get('alt') === 'emoji'), false);
});

// --- attributes the components only read in kebab-case ----------------------------------

test('a reply to a member with a colored role carries that color, one without carries none', async (t) => {
    const { body } = await render(t, (w) => {
        const fromAlice = w.message({ createdAt: at(0, 9, 23), content: 'alice speaks' });
        const fromBob = w.message({ createdAt: at(0, 9, 24), authorKey: 'bob', content: 'bob speaks' });
        return [fromAlice, fromBob,
            w.message({
                createdAt: at(0, 9, 25),
                authorKey: 'bob',
                type: 19,
                content: 'answering alice',
                message_reference: { type: 0, message_id: fromAlice.id, channel_id: IDS.channel, guild_id: IDS.guild },
            }),
            w.message({
                createdAt: at(0, 9, 26),
                type: 19,
                content: 'answering bob',
                message_reference: { type: 0, message_id: fromBob.id, channel_id: IDS.channel, guild_id: IDS.guild },
            })];
    });
    const replies = tags(body, 'discord-reply');
    assert.equal(replies.length, 2);
    const [replyToAlice, replyToBob] = replies;
    // Alice's highest colored role is Moderator (#3498db).
    assert.equal(replyToAlice.get('author'), 'Ally');
    assert.equal(replyToAlice.get('role-color'), '#3498db');
    // Bob has no colored role: displayHexColor is #000000, which would paint him black.
    assert.equal(replyToBob.get('author'), 'bob');
    assert.equal(replyToBob.has('role-color'), false);
});

test('an embed footer icon reaches the footer component', async (t) => {
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 27),
        embeds: [{
            type: 'rich',
            description: 'with a footer',
            footer: { text: 'Ticket system', icon_url: 'https://example.com/f.png', proxy_icon_url: 'https://images-ext-1.discordapp.net/f.png' },
        }],
    })]);
    const [footer] = tags(body, 'discord-embed-footer');
    assert.equal(footer.get('footer-image'), 'https://images-ext-1.discordapp.net/f.png');
});

test('audio and file attachments pass their size unit to the component', async (t) => {
    const file = (id, name, type, size) => ({
        id,
        filename: name,
        size,
        url: `https://cdn.discordapp.com/attachments/1/2/${name}`,
        proxy_url: `https://media.discordapp.net/attachments/1/2/${name}`,
        content_type: type,
    });
    const { body } = await render(t, (w) => [w.message({
        createdAt: at(0, 9, 28),
        content: 'files',
        attachments: [
            file('1100000000000070101', 'song.mp3', 'audio/mpeg', 3 * 1024 * 1024),
            file('1100000000000070102', 'notes.txt', 'text/plain', 2048),
        ],
    })]);
    const [audio] = tags(body, 'discord-audio-attachment');
    assert.equal(audio.get('bytes'), '3');
    assert.equal(audio.get('bytes-unit'), 'MB');
    const [plain] = tags(body, 'discord-file-attachment');
    assert.equal(plain.get('bytes'), '2');
    assert.equal(plain.get('bytes-unit'), 'KB');
});

test('an AutoMod alert names the channel instead of printing its mention syntax', async (t) => {
    const automod = (minute, channelId) => ({
        createdAt: at(0, 9, minute),
        type: 24,
        content: '',
        embeds: [{
            type: 'auto_moderation_message',
            description: 'buy cheap nitro',
            fields: [
                { name: 'rule_name', value: 'No scam links', inline: false },
                { name: 'channel_id', value: channelId, inline: false },
            ],
        }],
    });
    const { body } = await render(t, (w) => [
        w.message(automod(29, IDS.otherChannel)),
        w.message(automod(30, '1100000000000000999')),
        w.message(automod(31, `<#${IDS.channel}>`)),
    ]);
    assert.match(body, /<span class="dht-automod-rule"> · In #general<\/span>/);
    // A channel this server does not know falls back to its id.
    assert.match(body, /<span class="dht-automod-rule"> · In #1100000000000000999<\/span>/);
    // The mention form is understood as well.
    assert.match(body, /<span class="dht-automod-rule"> · In #ticket-0042<\/span>/);
    assert.doesNotMatch(body, /In &lt;#/);
});

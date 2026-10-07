'use strict';
// Builds REAL discord.js structures from raw Discord API payloads — no login, no
// network. The renderer therefore sees exactly the classes, Collections, flags and
// getters it sees in production, instead of hand-written look-alikes.

const { Client, ClientApplication, ClientUser, GatewayIntentBits } = require('discord.js');

// The fixed instant every scenario is rendered at. Snowflakes below are derived
// from it, so "today", "yesterday" and "older" stay what they are forever.
const NOW = new Date(Date.UTC(2026, 4, 20, 15, 30, 0)); // Wed 20 May 2026, 15:30 UTC

const DISCORD_EPOCH = 1420070400000n;
let increment = 0;

/** A snowflake whose embedded creation time is `date`. */
function snowflakeAt(date) {
    increment = (increment + 1) % 4096;
    return (((BigInt(date.getTime()) - DISCORD_EPOCH) << 22n) | BigInt(increment)).toString();
}

/** NOW shifted by whole days and set to a time of day (UTC). */
function at(daysAgo, hours, minutes) {
    const d = new Date(NOW);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
}

/**
 * A fixed snowflake created at `date`. discord.js derives Message#createdAt from the
 * id, and a thread shares its id with its starter message, so such ids must carry
 * the starter's time. The high sequence keeps them apart from snowflakeAt() ids.
 */
function fixedSnowflake(date, sequence) {
    return (((BigInt(date.getTime()) - DISCORD_EPOCH) << 22n) | BigInt(4000 + sequence)).toString();
}

const IDS = {
    guild: '1100000000000000001',
    everyone: '1100000000000000001',
    roleMod: '1100000000000000002',
    roleVip: '1100000000000000003',
    roleNoColor: '1100000000000000004',
    channel: '1100000000000000100',
    otherChannel: '1100000000000000101',
    forum: '1100000000000000102',
    // Threads whose starter message is part of a scenario (see fixedSnowflake).
    forumPost: fixedSnowflake(at(1, 9, 0), 1),
    thread: fixedSnowflake(at(0, 17, 0), 2),
    quietThread: fixedSnowflake(at(0, 17, 1), 3),
    alice: '1100000000000000010',
    bob: '1100000000000000011',
    botUser: '1100000000000000012',
    webhookUser: '1100000000000000013',
    application: '1100000000000000020',
    command: '1100000000000000030',
    customEmoji: '1100000000000000040',
    animatedEmoji: '1100000000000000041',
    sticker: '1100000000000000050',
    webhook: '1100000000000000060',
    otherGuild: '1100000000000000900',
};

function role(id, name, color, position, extra = {}) {
    return {
        id,
        name,
        color,
        // Discord sends gradient colors for every role since 2025, and discord.js'
        // Role#hexColor dereferences them unconditionally.
        colors: { primary_color: color, secondary_color: null, tertiary_color: null },
        position,
        permissions: '0',
        hoist: false,
        managed: false,
        mentionable: true,
        flags: 0,
        icon: null,
        unicode_emoji: null,
        ...extra,
    };
}

function user(id, username, globalName, extra = {}) {
    return {
        id,
        username,
        global_name: globalName,
        discriminator: '0',
        avatar: null,
        bot: false,
        public_flags: 0,
        ...extra,
    };
}

const USERS = {
    alice: user(IDS.alice, 'alice', 'Alice'),
    bob: user(IDS.bob, 'bob', null),
    bot: user(IDS.botUser, 'helper-bot', 'Helper Bot', { bot: true }),
};

function memberPayload(roles, nick = null) {
    return {
        nick,
        roles,
        joined_at: '2024-01-01T00:00:00.000Z',
        premium_since: null,
        avatar: null,
        deaf: false,
        mute: false,
        flags: 0,
        pending: false,
        communication_disabled_until: null,
    };
}

function createWorld() {
    increment = 0;
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    // Transcripts are always produced by a logged-in bot, which is the client user.
    // Reactions with `me: true` and similar fields dereference it.
    client.user = new ClientUser(client, USERS.bot);
    // Set on READY in production. MessageReaction#emoji reads its emoji cache for
    // every custom emoji reaction.
    client.application = new ClientApplication(client, { id: IDS.application, name: 'Helper Bot', flags: 0 });

    const guild = client.guilds._add({
        id: IDS.guild,
        name: 'Fixture Guild',
        icon: null,
        owner_id: IDS.alice,
        roles: [
            role(IDS.everyone, '@everyone', 0, 0, { mentionable: false }),
            role(IDS.roleMod, 'Moderator', 0x3498db, 3, { hoist: true }),
            role(IDS.roleVip, 'VIP', 0xe67e22, 2),
            role(IDS.roleNoColor, 'Plain', 0, 1),
        ],
        emojis: [],
        stickers: [],
        features: [],
        channels: [],
        members: [],
        premium_tier: 0,
        preferred_locale: 'en-US',
    });

    const channel = client.channels._add({
        id: IDS.channel,
        type: 0,
        guild_id: IDS.guild,
        name: 'ticket-0042',
        topic: 'Support ticket for **Alice**',
        position: 0,
        permission_overwrites: [],
        parent_id: null,
        nsfw: false,
        rate_limit_per_user: 0,
    }, guild);

    client.channels._add({
        id: IDS.otherChannel,
        type: 0,
        guild_id: IDS.guild,
        name: 'general',
        position: 1,
        permission_overwrites: [],
    }, guild);

    // Members land in the guild cache so mentions and colors resolve without REST.
    guild.members._add({ ...memberPayload([IDS.roleMod, IDS.roleVip], 'Ally'), user: USERS.alice });
    guild.members._add({ ...memberPayload([]), user: USERS.bob });
    guild.members._add({ ...memberPayload([IDS.roleNoColor]), user: USERS.bot });

    // A forum channel with tags and one post (a thread) that has two of them applied.
    const forum = client.channels._add({
        id: IDS.forum,
        type: 15,
        guild_id: IDS.guild,
        name: 'help-forum',
        position: 2,
        permission_overwrites: [],
        available_tags: [
            { id: '1100000000000000201', name: 'Bug', moderated: false, emoji_id: null, emoji_name: '🐛' },
            { id: '1100000000000000202', name: 'Billing', moderated: false, emoji_id: null, emoji_name: null },
            { id: '1100000000000000203', name: 'Unused', moderated: true, emoji_id: null, emoji_name: null },
        ],
    }, guild);
    const forumPost = client.channels._add({
        id: IDS.forumPost,
        type: 11,
        guild_id: IDS.guild,
        parent_id: IDS.forum,
        owner_id: IDS.alice,
        name: 'Login broken after update',
        applied_tags: ['1100000000000000201', '1100000000000000202'],
        thread_metadata: { archived: false, auto_archive_duration: 1440, archive_timestamp: '2026-05-01T00:00:00.000Z', locked: false },
        message_count: 2,
        member_count: 2,
    }, guild);

    const dm = client.channels._add({
        id: '1100000000000000110',
        type: 1,
        recipients: [USERS.bob],
        last_message_id: null,
    });

    return {
        client,
        guild,
        channel,
        forum,
        forumPost,
        dm,
        users: USERS,
        /** Adds a raw message payload to `target` and returns the real Message. */
        message(raw, target = channel) {
            const createdAt = raw.createdAt || at(0, 12, 0);
            const authorKey = raw.authorKey || 'alice';
            const author = raw.author || USERS[authorKey];
            const member = raw.member === undefined
                ? (authorKey === 'alice' ? memberPayload([IDS.roleMod, IDS.roleVip], 'Ally')
                    : authorKey === 'bob' ? memberPayload([])
                        : authorKey === 'bot' ? memberPayload([IDS.roleNoColor]) : undefined)
                : raw.member;
            const payload = {
                id: raw.id || snowflakeAt(createdAt),
                channel_id: target.id,
                guild_id: target.guildId ?? undefined,
                author,
                content: '',
                timestamp: createdAt.toISOString(),
                edited_timestamp: null,
                tts: false,
                mention_everyone: false,
                mentions: [],
                mention_roles: [],
                attachments: [],
                embeds: [],
                reactions: [],
                pinned: false,
                type: 0,
                flags: 0,
                components: [],
                ...raw,
            };
            if (member && target.guildId) payload.member = member;
            delete payload.createdAt;
            delete payload.authorKey;
            const msg = target.messages._add(payload);
            if (raw.extra) Object.assign(msg, raw.extra);
            return msg;
        },
        destroy() {
            return client.destroy();
        },
    };
}

module.exports = { createWorld, snowflakeAt, at, NOW, IDS, USERS, role, user, memberPayload };

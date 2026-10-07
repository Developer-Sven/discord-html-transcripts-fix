'use strict';
// Each scenario returns the messages to render and the options to render them
// with. Together they are meant to drive every renderer branch at least once;
// coverage of dist/ is measured to prove it.
const { at, IDS, USERS, user } = require('../helpers/world');

function attachment(id, filename, contentType, extra = {}) {
    return {
        id,
        filename,
        size: 123456,
        url: `https://cdn.discordapp.com/attachments/${IDS.channel}/${id}/${filename}`,
        proxy_url: `https://media.discordapp.net/attachments/${IDS.channel}/${id}/${filename}`,
        content_type: contentType,
        ...extra,
    };
}

const scenarios = {
    // --- plain text & markdown -------------------------------------------------
    'markdown-basics': (w) => ({
        messages: [
            w.message({ createdAt: at(3, 9, 5), content: '**bold** *italic* __underline__ ~~strike~~ ||spoiler|| `inline code`' }),
            w.message({ createdAt: at(3, 9, 6), content: '# Heading 1\n## Heading 2\n### Heading 3\n-# subtext line' }),
            w.message({ createdAt: at(3, 9, 7), content: '> quoted line\n>>> multi\nline quote' }),
            w.message({ createdAt: at(3, 9, 8), content: '- item one\n- item two\n  - nested\n1. first\n2. second' }),
            w.message({ createdAt: at(3, 9, 9), content: '```js\nconst answer = 42;\nconsole.log(answer);\n```\n```\nno language here\n```' }),
            w.message({ createdAt: at(3, 9, 10), content: '[masked link](https://example.com/docs) and https://example.com/plain <https://example.com/no-embed>' }),
            w.message({ createdAt: at(3, 9, 11), content: 'escaped \\*not italic\\* and a lone * star and html <b>not bold</b> & ampersand' }),
        ],
    }),

    'mentions-and-emoji': (w) => ({
        messages: [
            w.message({
                createdAt: at(1, 18, 0),
                content: `hey <@${IDS.bob}> and <@!${IDS.alice}>, see <#${IDS.otherChannel}>, ping <@&${IDS.roleMod}> <@&${IDS.roleNoColor}> and @everyone @here`,
                mentions: [USERS.bob, USERS.alice],
                mention_roles: [IDS.roleMod, IDS.roleNoColor],
                mention_everyone: true,
            }),
            w.message({
                createdAt: at(1, 18, 1),
                authorKey: 'bob',
                content: `unicode 😀🎉👍🏽 custom <:blobwave:${IDS.customEmoji}> animated <a:partyparrot:${IDS.animatedEmoji}> and </ticket close:${IDS.command}>`,
            }),
            w.message({
                createdAt: at(1, 18, 2),
                authorKey: 'bob',
                content: `unknown user <@${'9'.repeat(18)}> unknown role <@&${'8'.repeat(18)}> unknown channel <#${'7'.repeat(18)}>`,
            }),
            w.message({ createdAt: at(1, 18, 3), content: '😀😀😀' }),
        ],
    }),

    'discord-timestamps': (w) => {
        const t = Math.floor(at(2, 8, 0).getTime() / 1000);
        return {
            messages: [
                w.message({
                    createdAt: at(0, 10, 0),
                    content: `<t:${t}> <t:${t}:t> <t:${t}:T> <t:${t}:d> <t:${t}:D> <t:${t}:f> <t:${t}:F> <t:${t}:R> <t:notanumber:R>`,
                }),
            ],
        };
    },

    // --- timestamp labels & options ---------------------------------------------
    'timestamp-labels': (w) => ({
        messages: [
            w.message({ createdAt: at(400, 23, 59), content: 'last year' }),
            w.message({ createdAt: at(2, 7, 16), content: 'two days ago' }),
            w.message({ createdAt: at(1, 22, 45), content: 'yesterday' }),
            w.message({ createdAt: at(0, 0, 5), content: 'just after midnight today' }),
            w.message({ createdAt: at(0, 15, 29), content: 'a minute ago', edited_timestamp: at(0, 15, 29).toISOString() }),
        ],
    }),

    // --- authors, edits, pins --------------------------------------------------------
    'authors-and-states': (w) => ({
        messages: [
            w.message({ createdAt: at(0, 9, 0), content: 'first from alice' }),
            w.message({ createdAt: at(0, 9, 1), content: 'grouped follow-up from alice' }),
            w.message({ createdAt: at(0, 9, 2), authorKey: 'bob', content: 'bob, no roles, no nickname' }),
            w.message({ createdAt: at(0, 9, 3), authorKey: 'bot', content: 'I am a bot' }),
            w.message({ createdAt: at(0, 9, 4), content: 'this got edited', edited_timestamp: at(0, 9, 30).toISOString() }),
            w.message({ createdAt: at(0, 9, 5), content: 'pinned announcement', pinned: true }),
            w.message({
                createdAt: at(0, 9, 6),
                author: user(IDS.webhookUser, 'Status Webhook', null, { bot: true }),
                member: null,
                webhook_id: IDS.webhook,
                content: 'sent through a webhook',
            }),
            w.message({
                createdAt: at(0, 9, 7),
                content: 'has an edit history',
                edited_timestamp: at(0, 9, 40).toISOString(),
                extra: {
                    editHistory: [
                        { content: 'first draft', editedAt: at(0, 9, 20) },
                        { content: 'second draft', editedAt: at(0, 9, 30) },
                    ],
                },
            }),
        ],
    }),

    // --- replies & forwards -------------------------------------------------------------
    'replies-and-forwards': (w) => {
        const original = w.message({ createdAt: at(0, 11, 0), authorKey: 'bob', content: 'original question with **markdown**' });
        return {
            messages: [
                original,
                w.message({
                    createdAt: at(0, 11, 5),
                    type: 19,
                    content: 'a reply',
                    message_reference: { type: 0, message_id: original.id, channel_id: IDS.channel, guild_id: IDS.guild },
                    referenced_message: {
                        id: original.id, channel_id: IDS.channel, guild_id: IDS.guild, author: USERS.bob,
                        content: original.content, timestamp: original.createdAt.toISOString(), edited_timestamp: null,
                        tts: false, mention_everyone: false, mentions: [], mention_roles: [], attachments: [], embeds: [],
                        pinned: false, type: 0, flags: 0, components: [],
                    },
                    mentions: [USERS.bob],
                }),
                w.message({
                    createdAt: at(0, 11, 6),
                    type: 19,
                    content: 'reply to a deleted message',
                    message_reference: { type: 0, message_id: '1100000000000099999', channel_id: IDS.channel, guild_id: IDS.guild },
                    referenced_message: null,
                }),
                w.message({
                    createdAt: at(0, 11, 7),
                    content: '',
                    message_reference: { type: 1, message_id: '1100000000000088888', channel_id: IDS.otherChannel, guild_id: IDS.guild },
                    message_snapshots: [{
                        message: {
                            content: 'forwarded **content** with an attachment',
                            embeds: [],
                            attachments: [attachment('1100000000000077777', 'forwarded.png', 'image/png', { width: 800, height: 600 })],
                            timestamp: at(5, 8, 0).toISOString(),
                            edited_timestamp: null,
                            flags: 0,
                            mentions: [],
                            mention_roles: [],
                            type: 0,
                            components: [],
                            sticker_items: [],
                        },
                    }],
                }),
            ],
        };
    },

    // --- embeds -------------------------------------------------------------------------------
    'embeds': (w) => ({
        messages: [
            w.message({
                createdAt: at(0, 13, 0),
                authorKey: 'bot',
                embeds: [{
                    type: 'rich',
                    title: 'Ticket **opened**',
                    url: 'https://example.com/ticket/42',
                    description: 'A description with `code` and a [link](https://example.com).',
                    color: 0x57f287,
                    timestamp: at(0, 12, 59).toISOString(),
                    author: { name: 'Support Team', url: 'https://example.com/team', icon_url: 'https://example.com/team.png' },
                    thumbnail: { url: 'https://example.com/thumb.png', proxy_url: 'https://images-ext-1.discordapp.net/thumb.png', width: 80, height: 80 },
                    image: { url: 'https://example.com/banner.png', proxy_url: 'https://images-ext-1.discordapp.net/banner.png', width: 1200, height: 400 },
                    footer: { text: 'Ticket system', icon_url: 'https://example.com/footer.png' },
                    fields: [
                        { name: 'Priority', value: 'High', inline: true },
                        { name: 'Category', value: 'Billing', inline: true },
                        { name: 'Details', value: 'Multi\nline **value**', inline: false },
                    ],
                }],
            }),
            w.message({
                createdAt: at(0, 13, 1),
                content: 'https://example.com/video',
                embeds: [{
                    type: 'video',
                    url: 'https://example.com/video',
                    title: 'A video',
                    provider: { name: 'YouTube', url: 'https://youtube.com' },
                    thumbnail: { url: 'https://example.com/video-thumb.jpg', width: 1280, height: 720 },
                    video: { url: 'https://www.youtube.com/embed/abc', width: 1280, height: 720 },
                }],
            }),
            w.message({
                createdAt: at(0, 13, 2),
                content: 'embeds suppressed',
                flags: 1 << 2,
                embeds: [{ type: 'rich', title: 'should not show', description: 'hidden' }],
            }),
            w.message({
                createdAt: at(0, 13, 3),
                authorKey: 'bot',
                embeds: [
                    { type: 'rich', description: 'only a description, no color' },
                    { type: 'image', url: 'https://example.com/raw.png', thumbnail: { url: 'https://example.com/raw.png', width: 300, height: 200 } },
                ],
            }),
        ],
    }),

    // --- attachments ---------------------------------------------------------------------------
    'attachments': (w) => ({
        messages: [
            w.message({
                createdAt: at(0, 14, 0),
                content: 'files',
                attachments: [
                    attachment('1100000000000070001', 'screenshot.png', 'image/png', { width: 1920, height: 1080 }),
                    attachment('1100000000000070002', 'clip.mp4', 'video/mp4', { width: 1280, height: 720 }),
                    attachment('1100000000000070003', 'song.mp3', 'audio/mpeg'),
                    attachment('1100000000000070004', 'report.pdf', 'application/pdf'),
                    attachment('1100000000000070005', 'SPOILER_secret.png', 'image/png', { width: 640, height: 480 }),
                    attachment('1100000000000070006', 'notes', undefined),
                ],
            }),
            w.message({
                createdAt: at(0, 14, 1),
                flags: 1 << 13,
                attachments: [
                    attachment('1100000000000070007', 'voice-message.ogg', 'audio/ogg', {
                        duration_secs: 7.4,
                        waveform: 'AAAAGhoaGhpERERERERERERERCYmJiYmJiYmJiYmYGBgYGBgYGBgYGBg==',
                        flags: 1 << 13,
                    }),
                ],
            }),
        ],
    }),

    // --- reactions & stickers ---------------------------------------------------------------------
    'reactions-and-stickers': (w) => ({
        messages: [
            w.message({
                createdAt: at(0, 15, 0),
                content: 'react to this',
                reactions: [
                    { count: 3, count_details: { burst: 0, normal: 3 }, me: false, me_burst: false, burst_colors: [], emoji: { id: null, name: '👍' } },
                    { count: 1, count_details: { burst: 0, normal: 1 }, me: true, me_burst: false, burst_colors: [], emoji: { id: IDS.customEmoji, name: 'blobwave', animated: false } },
                    { count: 2, count_details: { burst: 1, normal: 1 }, me: false, me_burst: false, burst_colors: ['#ff0000'], emoji: { id: IDS.animatedEmoji, name: 'partyparrot', animated: true } },
                ],
            }),
            w.message({
                createdAt: at(0, 15, 1),
                authorKey: 'bob',
                sticker_items: [{ id: IDS.sticker, name: 'Wave', format_type: 1 }],
            }),
        ],
    }),

    // --- poll ---------------------------------------------------------------------------------------
    'poll': (w) => ({
        messages: [
            w.message({
                createdAt: at(0, 15, 10),
                poll: {
                    question: { text: 'Which plan?' },
                    answers: [
                        { answer_id: 1, poll_media: { text: 'Basic', emoji: { id: null, name: '🅱️' } } },
                        { answer_id: 2, poll_media: { text: 'Pro' } },
                        { answer_id: 3, poll_media: { text: 'Enterprise', emoji: { id: IDS.customEmoji, name: 'blobwave' } } },
                    ],
                    expiry: at(-1, 15, 10).toISOString(),
                    allow_multiselect: false,
                    layout_type: 1,
                    results: { is_finalized: false, answer_counts: [{ id: 1, count: 2, me_voted: false }, { id: 2, count: 5, me_voted: true }] },
                },
            }),
        ],
    }),

    // --- components v1 ----------------------------------------------------------------------------
    'components-v1': (w) => ({
        messages: [
            w.message({
                createdAt: at(0, 15, 20),
                authorKey: 'bot',
                content: 'Pick one:',
                components: [
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 1, label: 'Primary', custom_id: 'p' },
                            { type: 2, style: 2, label: 'Secondary', custom_id: 's', emoji: { name: '🔒' } },
                            { type: 2, style: 3, label: 'Success', custom_id: 'ok' },
                            { type: 2, style: 4, label: 'Danger', custom_id: 'no', disabled: true },
                            { type: 2, style: 5, label: 'Docs', url: 'https://example.com/docs' },
                        ],
                    },
                    { type: 1, components: [{ type: 3, custom_id: 'menu', placeholder: 'Choose a topic', options: [{ label: 'Billing', value: 'b', description: 'Money stuff', emoji: { name: '💳' } }, { label: 'Tech', value: 't' }], min_values: 1, max_values: 1 }] },
                    { type: 1, components: [{ type: 5, custom_id: 'u', placeholder: 'Pick a user' }] },
                    { type: 1, components: [{ type: 6, custom_id: 'r', placeholder: 'Pick a role' }] },
                    { type: 1, components: [{ type: 7, custom_id: 'm', placeholder: 'Pick anyone' }] },
                    { type: 1, components: [{ type: 8, custom_id: 'c', placeholder: 'Pick a channel', channel_types: [0] }] },
                ],
            }),
        ],
    }),

    // --- components v2 ----------------------------------------------------------------------------
    'components-v2': (w) => ({
        messages: [
            w.message({
                createdAt: at(0, 15, 25),
                authorKey: 'bot',
                flags: 1 << 15,
                attachments: [attachment('1100000000000070010', 'invoice.pdf', 'application/pdf')],
                components: [
                    {
                        type: 17,
                        accent_color: 0x5865f2,
                        spoiler: false,
                        components: [
                            { type: 10, content: '## Ticket #42\nOpened by <@' + IDS.alice + '>' },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 9,
                                components: [{ type: 10, content: '**Status:** open' }, { type: 10, content: 'Second text block' }],
                                accessory: { type: 11, media: { url: 'https://example.com/avatar.png' }, description: 'thumbnail', spoiler: false },
                            },
                            {
                                type: 9,
                                components: [{ type: 10, content: 'Close the ticket when done.' }],
                                accessory: { type: 2, style: 4, label: 'Close', custom_id: 'close' },
                            },
                            { type: 14, divider: false, spacing: 2 },
                            { type: 12, items: [{ media: { url: 'https://example.com/a.png' }, description: 'first' }, { media: { url: 'https://example.com/b.png' }, spoiler: true }] },
                            { type: 13, file: { url: 'attachment://invoice.pdf' }, spoiler: false },
                            { type: 1, components: [{ type: 2, style: 1, label: 'Claim', custom_id: 'claim' }] },
                        ],
                    },
                    { type: 10, content: 'Text outside the container' },
                    { type: 17, accent_color: null, spoiler: true, components: [{ type: 10, content: 'spoilered container' }] },
                ],
            }),
        ],
    }),

    // --- interactions --------------------------------------------------------------------------------
    'interactions': (w) => ({
        messages: [
            w.message({
                createdAt: at(0, 15, 26),
                authorKey: 'bot',
                type: 20,
                application_id: IDS.application,
                content: 'Ticket created.',
                interaction: { id: '1100000000000060001', type: 2, name: 'ticket open', user: USERS.alice },
                interaction_metadata: {
                    id: '1100000000000060001',
                    type: 2,
                    user: USERS.alice,
                    authorizing_integration_owners: { 0: IDS.guild },
                    name: 'ticket open',
                },
            }),
            w.message({
                createdAt: at(0, 15, 27),
                authorKey: 'bot',
                type: 23,
                application_id: IDS.application,
                content: 'Context menu result',
                interaction: { id: '1100000000000060002', type: 2, name: 'Report message', user: USERS.bob },
            }),
        ],
    }),
};

// --- system messages ----------------------------------------------------------------------------
scenarios['system-messages'] = (w) => {
    let minute = 0;
    const sys = (type, extra = {}) => w.message({ createdAt: at(0, 8, minute++), type, content: '', ...extra });
    const target = w.message({ createdAt: at(0, 7, 59), content: 'a message that gets pinned and threaded' });
    const ref = { message_id: target.id, channel_id: IDS.channel, guild_id: IDS.guild };
    return {
        messages: [
            target,
            sys(7),
            sys(7, { authorKey: 'bob' }),
            sys(1, { mentions: [USERS.bob] }),
            sys(2, { mentions: [USERS.bob] }),
            sys(3, { call: { participants: [IDS.alice, IDS.bob], ended_timestamp: at(0, 8, 30).toISOString() } }),
            sys(3, { call: { participants: [IDS.alice], ended_timestamp: null } }),
            sys(4, { content: 'renamed-ticket' }),
            sys(5),
            sys(6, { message_reference: ref }),
            sys(8),
            sys(9, { content: '2' }),
            sys(10),
            sys(11),
            sys(12, { content: 'Announcements Server #news' }),
            sys(18, { content: 'Follow-up thread', message_reference: { channel_id: IDS.thread, guild_id: IDS.guild } }),
            sys(21, { message_reference: ref }),
            sys(24, {
                authorKey: 'bob',
                embeds: [{
                    type: 'auto_moderation_message',
                    description: 'buy cheap nitro here',
                    fields: [
                        { name: 'rule_name', value: 'No scam links', inline: false },
                        { name: 'channel_id', value: IDS.channel, inline: false },
                        { name: 'decision_id', value: '1100000000000000300', inline: false },
                        { name: 'keyword', value: 'nitro', inline: false },
                    ],
                }],
            }),
            sys(25, {
                content: 'Gold',
                role_subscription_data: { role_subscription_listing_id: '1100000000000000400', tier_name: 'Gold', total_months_subscribed: 3, is_renewal: true },
            }),
            sys(27, { content: 'Town hall' }),
            sys(28, { content: 'Town hall' }),
            sys(29),
            sys(30),
            sys(31, { content: 'New topic' }),
            sys(32, { application_id: IDS.application }),
            sys(36),
            sys(37),
            sys(38),
            sys(39),
            sys(46, {
                message_reference: ref,
                embeds: [{
                    type: 'poll_result',
                    fields: [
                        { name: 'poll_question_text', value: 'Which plan?', inline: false },
                        { name: 'victor_answer_votes', value: '5', inline: false },
                        { name: 'total_votes', value: '7', inline: false },
                        { name: 'victor_answer_id', value: '2', inline: false },
                        { name: 'victor_answer_text', value: 'Pro', inline: false },
                    ],
                }],
            }),
            // Types the renderer has no case for. Recorded so the snapshot pins the
            // current behaviour (they are dropped) until that is decided.
            sys(14),
            sys(22),
            sys(26),
            sys(44),
        ],
    };
};

// --- channels -------------------------------------------------------------------------------------
scenarios['forum-thread'] = (w) => ({
    channel: w.forumPost,
    messages: [
        w.message({ id: IDS.forumPost, createdAt: at(1, 9, 0), content: 'After the last update I cannot log in.' }, w.forumPost),
        w.message({ createdAt: at(1, 9, 5), authorKey: 'bob', content: 'Same here.' }, w.forumPost),
    ],
});

scenarios['dm-channel'] = (w) => ({
    channel: w.dm,
    messages: [
        w.message({ createdAt: at(0, 10, 0), authorKey: 'bob', member: null, content: `hi <@${IDS.alice}>`, mentions: [USERS.alice] }, w.dm),
        w.message({ createdAt: at(0, 10, 1), member: null, content: 'hello back' }, w.dm),
    ],
});

scenarios['empty-transcript'] = () => ({ messages: [] });

// --- options ------------------------------------------------------------------------------------------
function optionsCorpus(w) {
    return [
        w.message({ createdAt: at(30, 10, 0), content: 'an older message with an image', attachments: [attachment('1100000000000071001', 'pic.png', 'image/png', { width: 400, height: 300 })] }),
        w.message({ createdAt: at(1, 22, 45), authorKey: 'bob', content: 'yesterday ||with a spoiler||' }),
        w.message({ createdAt: at(0, 7, 16), content: 'today', edited_timestamp: at(0, 7, 20).toISOString() }),
    ];
}

scenarios['options-german'] = (w) => ({ messages: optionsCorpus(w), options: { language: 'de' } });
scenarios['options-us-format'] = (w) => ({ messages: optionsCorpus(w), options: { dateFormat: 'mm/dd/yyyy', timeFormat: '12h' } });
scenarios['options-i18n-override'] = (w) => ({
    messages: optionsCorpus(w),
    options: { language: 'en', i18n: { en: { yesterdayAt: 'Yday {time}', edited: 'changed' }, de: { yesterdayAt: 'Gestern {time}' } } },
});
scenarios['options-stats-template'] = (w) => ({
    messages: optionsCorpus(w),
    options: { statsFooter: { template: '{messages} | {participants} | {images} | {from} -> {to} | {span}' } },
});
scenarios['options-stats-disabled-legacy-footer'] = (w) => ({
    messages: optionsCorpus(w),
    options: { statsFooter: false, footerText: 'Exported {number} message{s}.', poweredBy: true },
});
scenarios['options-stats-enabled-false'] = (w) => ({ messages: optionsCorpus(w), options: { statsFooter: { enabled: false } } });
scenarios['options-favicon-url'] = (w) => ({ messages: optionsCorpus(w), options: { favicon: 'https://example.com/icon.png' } });
scenarios['options-favicon-guild-icon'] = (w) => {
    w.guild.icon = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
    return { messages: optionsCorpus(w) };
};
scenarios['options-hydrate'] = (w) => ({ messages: optionsCorpus(w), options: { hydrate: true } });

// --- message details -------------------------------------------------------------------------------
scenarios['flags-activity-counts'] = (w) => ({
    messages: [
        w.message({ createdAt: at(0, 16, 0), content: 'silent message', flags: 1 << 12 }),
        w.message({ createdAt: at(0, 16, 1), content: 'crossposted to followers', flags: 1 << 0 }),
        w.message({ createdAt: at(0, 16, 2), authorKey: 'bot', content: 'received from a followed channel', flags: 1 << 1 }),
        w.message({ createdAt: at(0, 16, 3), content: 'join my party', activity: { type: 1, party_id: 'spotify:1234567890abcdef' } }),
        w.message({ createdAt: at(0, 16, 4), content: 'listen along', activity: { type: 3 } }),
        w.message({ createdAt: at(0, 16, 5), content: 'ask to join', activity: { type: 5, party_id: 'p' } }),
        w.message({
            createdAt: at(0, 16, 6),
            content: 'popular',
            reactions: [
                { count: 1500, count_details: { burst: 0, normal: 1500 }, me: false, me_burst: false, burst_colors: [], emoji: { id: null, name: '🔥' } },
                { count: 25000, count_details: { burst: 0, normal: 25000 }, me: false, me_burst: false, burst_colors: [], emoji: { id: null, name: '💯' } },
                { count: 2500000, count_details: { burst: 0, normal: 2500000 }, me: false, me_burst: false, burst_colors: [], emoji: { id: null, name: '🚀' } },
                { count: 999, count_details: { burst: 0, normal: 999 }, me: false, me_burst: false, burst_colors: [], emoji: { id: null, name: '✅' } },
            ],
        }),
    ],
});

scenarios['threads'] = (w) => {
    const thread = w.client.channels._add({
        id: IDS.thread,
        type: 11,
        guild_id: IDS.guild,
        parent_id: IDS.channel,
        owner_id: IDS.alice,
        name: 'Follow-up thread',
        message_count: 12,
        member_count: 2,
        last_message_id: null,
        thread_metadata: { archived: true, auto_archive_duration: 60, archive_timestamp: at(0, 17, 30).toISOString(), locked: true },
    }, w.guild);
    const last = w.message({ createdAt: at(0, 17, 10), authorKey: 'bob', content: 'last message **inside** the thread' }, thread);
    thread.lastMessageId = last.id;
    const quiet = w.client.channels._add({
        id: IDS.quietThread,
        type: 11,
        guild_id: IDS.guild,
        parent_id: IDS.channel,
        owner_id: IDS.bob,
        name: 'Empty thread',
        message_count: 0,
        thread_metadata: { archived: false, auto_archive_duration: 60, archive_timestamp: at(0, 17, 0).toISOString(), locked: false },
    }, w.guild);
    return {
        messages: [
            w.message({ id: IDS.thread, createdAt: at(0, 17, 0), content: 'starts a thread', flags: 1 << 5, thread: { id: IDS.thread, type: 11, guild_id: IDS.guild, parent_id: IDS.channel, name: thread.name, message_count: 12, thread_metadata: { archived: true, locked: true, auto_archive_duration: 60, archive_timestamp: at(0, 17, 30).toISOString() } } }),
            w.message({ id: quiet.id, createdAt: at(0, 17, 1), authorKey: 'bob', content: 'another thread', flags: 1 << 5, thread: { id: quiet.id, type: 11, guild_id: IDS.guild, parent_id: IDS.channel, name: quiet.name, message_count: 0, thread_metadata: { archived: false, locked: false, auto_archive_duration: 60, archive_timestamp: at(0, 17, 0).toISOString() } } }),
        ],
    };
};

scenarios['sticker-formats'] = (w) => ({
    messages: [
        w.message({ createdAt: at(0, 16, 10), sticker_items: [{ id: '1100000000000000051', name: 'Static', format_type: 1 }] }),
        w.message({ createdAt: at(0, 16, 11), sticker_items: [{ id: '1100000000000000052', name: 'Animated', format_type: 2 }] }),
        w.message({ createdAt: at(0, 16, 12), sticker_items: [{ id: '1100000000000000053', name: 'Lottie', format_type: 3 }] }),
        w.message({ createdAt: at(0, 16, 13), sticker_items: [{ id: '1100000000000000054', name: 'Gif', format_type: 4 }] }),
    ],
});

function rawOf(msg, overrides = {}) {
    return {
        id: msg.id, channel_id: msg.channelId, guild_id: msg.guildId, author: msg.author.toJSON ? { id: msg.author.id, username: msg.author.username, global_name: msg.author.globalName, discriminator: '0', avatar: null, bot: msg.author.bot } : msg.author,
        content: msg.content, timestamp: msg.createdAt.toISOString(), edited_timestamp: null, tts: false, mention_everyone: false,
        mentions: [], mention_roles: [], attachments: [], embeds: [], pinned: false, type: msg.type, flags: msg.flags.bitfield, components: [],
        ...overrides,
    };
}

scenarios['reply-variants'] = (w) => {
    const reply = (createdAt, target, raw = {}, content = 'replying') => w.message({
        createdAt, type: 19, content,
        message_reference: { type: 0, message_id: target.id, channel_id: IDS.channel, guild_id: IDS.guild },
        referenced_message: rawOf(target, raw),
    });
    const command = w.message({ createdAt: at(0, 18, 0), authorKey: 'bot', type: 20, content: '', interaction: { id: '1100000000000060009', type: 2, name: 'status', user: USERS.bob } });
    // The same forward as the message itself and as the reply's referenced message.
    const forwarded = {
        message_reference: { type: 1, message_id: '1100000000000088887', channel_id: IDS.otherChannel, guild_id: IDS.guild },
        message_snapshots: [{ message: { content: 'forwarded', embeds: [], attachments: [], timestamp: at(3, 0, 0).toISOString(), edited_timestamp: null, flags: 0, mentions: [], mention_roles: [], type: 0, components: [], sticker_items: [] } }],
    };
    const forward = w.message({ createdAt: at(0, 18, 1), authorKey: 'bob', content: '', ...forwarded });
    const buttons = w.message({ createdAt: at(0, 18, 2), authorKey: 'bot', content: '', components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Go', custom_id: 'go' }] }] });
    const sticker = w.message({ createdAt: at(0, 18, 3), authorKey: 'bob', sticker_items: [{ id: IDS.sticker, name: 'Wave', format_type: 1 }] });
    const file = w.message({ createdAt: at(0, 18, 4), authorKey: 'bob', attachments: [attachment('1100000000000072001', 'log.txt', 'text/plain')] });
    // Alice's top colored role (Moderator) must reach the reply bar as role-color.
    const colored = w.message({ createdAt: at(0, 18, 5), content: 'from a member with a colored role' });
    return {
        messages: [
            command, forward, buttons, sticker, file, colored,
            reply(at(0, 18, 10), command, { type: 20, interaction: { id: '1100000000000060009', type: 2, name: 'status', user: USERS.bob } }),
            reply(at(0, 18, 11), forward, { content: '', ...forwarded }),
            reply(at(0, 18, 12), buttons, { components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Go', custom_id: 'go' }] }] }),
            reply(at(0, 18, 13), sticker, { sticker_items: [{ id: IDS.sticker, name: 'Wave', format_type: 1 }] }),
            reply(at(0, 18, 14), file, { attachments: [attachment('1100000000000072001', 'log.txt', 'text/plain')] }),
            w.message({
                createdAt: at(0, 18, 15), type: 19, content: 'reply across servers',
                message_reference: { type: 0, message_id: '1100000000000099990', channel_id: '1100000000000000999', guild_id: IDS.otherGuild },
            }),
            reply(at(0, 18, 16), colored),
        ],
    };
};

scenarios['render-failure-fallback'] = (w) => {
    const broken = w.message({ createdAt: at(0, 19, 0), content: 'this message cannot be rendered' });
    // Simulates a structure that throws while rendering (e.g. a partial message).
    Object.defineProperty(broken, 'embeds', { get() { throw new Error('simulated renderer failure'); } });
    return {
        messages: [w.message({ createdAt: at(0, 18, 59), content: 'before' }), broken, w.message({ createdAt: at(0, 19, 1), content: 'after' })],
        expectWarnings: [/Render failed .* simulated renderer failure/],
    };
};

scenarios['media-gallery-sizes'] = (w) => {
    const gallery = (n) => ({ type: 12, items: Array.from({ length: n }, (_, i) => ({ media: { url: `https://example.com/g${n}-${i}.png` }, description: `image ${i + 1}` })) });
    return {
        messages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((n, i) => w.message({
            createdAt: at(0, 19, 10 + i),
            authorKey: 'bot',
            flags: 1 << 15,
            components: [{ type: 10, content: `${n} item${n === 1 ? '' : 's'}` }, gallery(n)],
        })),
    };
};

scenarios['pinned-variants'] = (w) => {
    const target = w.message({ createdAt: at(0, 20, 0), content: 'pin target' });
    return {
        messages: [
            target,
            w.message({ createdAt: at(0, 20, 1), type: 6, content: '', message_reference: { message_id: target.id, channel_id: IDS.channel, guild_id: IDS.guild } }),
            w.message({ createdAt: at(0, 20, 2), authorKey: 'bob', type: 6, content: '' }),
        ],
        options: { language: 'de' },
    };
};

// --- network paths (offline, mocked) -----------------------------------------------------------------

// A real 1x1 PNG, so anything that sniffs the bytes sees a valid image.
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function offline(configure) {
    return async () => {
        const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici');
        const previous = getGlobalDispatcher();
        const agent = new MockAgent();
        agent.disableNetConnect();
        configure(agent);
        setGlobalDispatcher(agent);
        return async () => {
            setGlobalDispatcher(previous);
            await agent.close();
        };
    };
}

scenarios['save-images'] = (w) => ({
    setup: offline((agent) => {
        const cdn = agent.get('https://cdn.discordapp.com');
        cdn.intercept({ path: /\/ok\.png$/, method: 'GET' }).reply(200, PNG_1X1, { headers: { 'content-type': 'image/png' } }).persist();
        cdn.intercept({ path: /\/missing\.png$/, method: 'GET' }).reply(404, 'not found').persist();
        cdn.intercept({ path: /\/html-instead\.png$/, method: 'GET' }).reply(200, PNG_1X1, { headers: { 'content-type': 'text/html' } }).persist();
        cdn.intercept({ path: /\/broken\.png$/, method: 'GET' }).replyWithError(new Error('socket hang up')).persist();
    }),
    messages: [
        w.message({
            createdAt: at(0, 21, 0),
            content: 'images to embed',
            attachments: [
                attachment('1100000000000073001', 'ok.png', 'image/png', { width: 1, height: 1 }),
                attachment('1100000000000073002', 'missing.png', 'image/png', { width: 1, height: 1 }),
                attachment('1100000000000073003', 'html-instead.png', 'image/png', { width: 1, height: 1 }),
                attachment('1100000000000073004', 'broken.png', 'image/png', { width: 1, height: 1 }),
                attachment('1100000000000073005', 'no-dimensions.png', 'image/png'),
            ],
        }),
    ],
    options: { saveImages: true },
});

scenarios['inline-assets'] = (w) => ({
    setup: offline((agent) => {
        const jsd = agent.get('https://cdn.jsdelivr.net');
        jsd.intercept({ path: /\.woff2$/, method: 'GET' }).reply(200, 'wOF2-FAKE').persist();
        jsd.intercept({ path: /.*/, method: 'GET' }).reply(200, 'export const ready = true;').persist();
        agent.get('https://cdnjs.cloudflare.com').intercept({ path: /.*/, method: 'GET' }).reply(200, '<svg xmlns="http://www.w3.org/2000/svg"/>').persist();
    }),
    messages: [
        w.message({
            createdAt: at(0, 21, 5),
            content: 'emoji 😀 and a reaction',
            reactions: [{ count: 1, count_details: { burst: 0, normal: 1 }, me: false, me_burst: false, burst_colors: [], emoji: { id: null, name: '👍' } }],
        }),
    ],
    options: { inlineAssets: true },
});

scenarios['create-transcript-paging'] = (w) => {
    // 150 messages so createTranscript has to page (100 per fetch), then a limit and a filter.
    const all = [];
    for (let i = 0; i < 150; i++) {
        all.push(w.message({ createdAt: at(10, 0, 0 + i), authorKey: i % 3 === 0 ? 'bob' : 'alice', content: `message ${i}` }));
    }
    const { Collection } = require('discord.js');
    // Newest first, like the real API; `before` pages backwards.
    const newestFirst = [...all].reverse();
    w.channel.messages.fetch = async ({ limit = 50, before } = {}) => {
        const start = before ? newestFirst.findIndex((m) => m.id === before) + 1 : 0;
        return new Collection(newestFirst.slice(start, start + limit).map((m) => [m.id, m]));
    };
    return {
        entry: 'createTranscript',
        messages: [],
        options: { limit: 120, filter: (m) => !m.content.endsWith('7') },
    };
};

scenarios['content-edge-cases'] = (w) => {
    const channelOfType = (id, type, name, extra = {}) => w.client.channels._add({ id, type, guild_id: IDS.guild, name, position: 9, permission_overwrites: [], ...extra }, w.guild);
    channelOfType('1100000000000000120', 2, 'Voice Lounge', { bitrate: 64000, user_limit: 0 });
    channelOfType('1100000000000000121', 13, 'Town Hall Stage', { bitrate: 64000 });
    channelOfType('1100000000000000122', 4, 'SUPPORT');
    channelOfType('1100000000000000123', 5, 'announcements');
    channelOfType('1100000000000000124', 11, 'a thread', { parent_id: IDS.channel, thread_metadata: { archived: false, locked: false, auto_archive_duration: 60, archive_timestamp: '2026-05-01T00:00:00.000Z' } });
    const longText = 'This is a deliberately long message that keeps going so that a reply preview has to cut it off. '.repeat(3);
    const long = w.message({ createdAt: at(0, 22, 0), authorKey: 'bob', content: longText });
    return {
        messages: [
            w.message({ createdAt: at(0, 21, 59), content: '```js\nconst unclosed = true;\nno closing fence' }),
            w.message({
                createdAt: at(0, 21, 59),
                content: 'voice <#1100000000000000120> stage <#1100000000000000121> category <#1100000000000000122> news <#1100000000000000123> thread <#1100000000000000124> forum <#' + IDS.forum + '>',
            }),
            long,
            w.message({
                createdAt: at(0, 22, 1), type: 19, content: 'replying to the long one',
                message_reference: { type: 0, message_id: long.id, channel_id: IDS.channel, guild_id: IDS.guild },
                referenced_message: rawOf(long, { content: longText }),
            }),
        ],
    };
};

// --- authors as production sends them ----------------------------------------------
scenarios['author-variants'] = (w) => ({
    messages: [
        // Served static all the same: the CDN answers some animated hashes with 415 as .gif.
        w.message({ createdAt: at(0, 11, 0), authorKey: 'carol', content: 'animated avatar' }),
        w.message({ createdAt: at(0, 11, 1), authorKey: 'dave', content: 'a different avatar on this server' }),
        w.message({ createdAt: at(0, 11, 2), authorKey: 'verifiedBot', content: 'a verified bot' }),
        // No nickname, roles or color to show, and nothing in the member cache to look up.
        w.message({ createdAt: at(0, 11, 3), authorKey: 'stranger', content: 'someone who left the server' }),
    ],
});

// --- untrusted text --------------------------------------------------------------------
// Everything a user controls, written to break out of the markup or the data island.
// The golden guards reject any event handler or script URL that survives.
scenarios['hostile-content'] = (w) => {
    const hostile = user('1100000000000000018', '</script><b>evil</b>', '"><img src=x onerror=alert(1)>');
    return {
        messages: [
            w.message({
                createdAt: at(0, 12, 0),
                content: '</script><script>alert(2)</script> <img src=x onerror=alert(3)> line separator [click](javascript:alert(4)) <javascript:alert(5)> https://example.com/"onmouseover="alert(6)',
            }),
            w.message({
                createdAt: at(0, 12, 1),
                author: hostile,
                content: 'my name is the attack',
                embeds: [{
                    type: 'rich',
                    url: 'javascript:alert(7)',
                    title: '<script>alert(8)</script>',
                    description: '[embedded](javascript:alert(9))',
                    author: { name: '"><svg onload=alert(10)>', url: 'javascript:alert(11)', icon_url: 'javascript:alert(12)' },
                    fields: [{ name: '<img src=x onerror=alert(13)>', value: '</script>', inline: false }],
                    footer: { text: '"onmouseover="alert(14)' },
                }],
                attachments: [attachment('1100000000000072100', '"><svg onload=alert(15)>.png', 'image/png', { description: '" onerror="alert(16)' })],
                reactions: [{ count: 1, count_details: { burst: 0, normal: 1 }, me: false, me_burst: false, burst_colors: ['red;background:url(javascript:alert(17))'], emoji: { id: null, name: '"><img src=x onerror=alert(18)>' } }],
            }),
        ],
    };
};

module.exports = { scenarios, attachment };

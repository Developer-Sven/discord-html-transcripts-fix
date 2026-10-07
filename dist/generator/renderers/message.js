"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiscordMessage;
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_js_1 = require("discord.js");
const utils_1 = require("../../utils/utils");
const attachment_1 = require("./attachment");
const components_1 = __importDefault(require("./components"));
const content_1 = __importStar(require("./content"));
const embed_1 = require("./embed");
const reply_1 = __importDefault(require("./reply"));
const systemMessage_1 = __importDefault(require("./systemMessage"));

const FLAG_CROSSPOSTED = 1 << 0;
const FLAG_IS_CROSSPOST = 1 << 1;
const FLAG_SUPPRESS_EMBEDS = 1 << 2;
const FLAG_SUPPRESS_NOTIFICATIONS = 1 << 12;
const FLAG_IS_VOICE_MESSAGE = 1 << 13;
const ACTIVITY_TYPES = { 1: 'Join', 2: 'Spectate', 3: 'Listen', 5: 'Join Request' };

function t(context, key, fallback) {
    const dict = context?.i18n?.[context?.lang] || context?.i18n?.en || {};
    return dict[key] || fallback || key;
}

async function DiscordMessage({ message, context }) {
    try {
        if (message.system)
            return (0, jsx_runtime_1.jsx)(systemMessage_1.default, { message: message, context: context });

        // Only replies count here: a forward from another server is not a
        // cross-server reply and must not get the server tag.
        const isCrossGuildReply = message.reference && !(0, utils_1.isForwardMessage)(message) && message.reference.guildId !== message.guild?.id;

        // Data-attrs for client-side filtering (keyword/author/role/date/has-*).
        const memberRoleIds = message.member?.roles?.cache
            ? Array.from(message.member.roles.cache.keys()).join(',')
            : '';
        const authorName = (message.member?.nickname || message.author?.displayName || message.author?.username || '').toLowerCase();
        const ts = message.createdAt instanceof Date ? message.createdAt.getTime() : 0;
        const lowerText = (message.content || '').toLowerCase().slice(0, 4096);
        const mediaFlags = detectMediaFlags(message);
        const hasImage = mediaFlags.hasImage;
        const hasEmbed = mediaFlags.hasEmbed;
        const hasAttachment = mediaFlags.hasAttachment;
        const hasComponentV2 = mediaFlags.hasComponentV2;
        const stickers = message.stickers && message.stickers.size > 0
            ? Array.from(message.stickers.values()).map((s) => ({
                id: s.id,
                name: s.name,
                url: s.url || `https://media.discordapp.net/stickers/${s.id}.png`,
                format: s.format,
            }))
            : [];
        const poll = (message.poll && (message.poll.question || (message.poll.answers && message.poll.answers.size))) ? message.poll : null;

        const flags = (typeof message.flags?.bitfield === 'number') ? message.flags.bitfield : 0;
        const suppressEmbeds = !!(flags & FLAG_SUPPRESS_EMBEDS);
        const isVoice = !!(flags & FLAG_IS_VOICE_MESSAGE);
        const isCrosspost = !!(flags & FLAG_IS_CROSSPOST);
        const isCrossposted = !!(flags & FLAG_CROSSPOSTED);
        const isSilent = !!(flags & FLAG_SUPPRESS_NOTIFICATIONS);
        const activity = message.activity ? {
            type: ACTIVITY_TYPES[message.activity.type] || 'Activity',
            partyId: message.activity.partyId,
        } : null;

        // Forwarded message snapshots (messageSnapshots) — render before the empty body.
        // discord.js exposes them as a Collection, never an array, so an Array.isArray
        // check left every forward empty ("Message could not be loaded.").
        const snapshots = toArray(message.messageSnapshots);
        const isForward = (0, utils_1.isForwardMessage)(message);
        // Discord hides who wrote a forwarded message (see renderSnapshots). Name the
        // channel it was forwarded from instead — only from this server, so a
        // transcript never reveals channel names of other servers the bot is in.
        const forwardedFromChannel = isForward && message.reference?.guildId && message.reference.guildId === message.guild?.id
            ? message.guild?.channels?.cache?.get(message.reference.channelId)
            : null;
        const forwardSource = forwardedFromChannel?.name ? '#' + forwardedFromChannel.name : null;

        const editedAtIso = message.editedAt instanceof Date ? message.editedAt.toISOString() : null;
        // Hover text for the "(edited)" marker — the ISO string stays in
        // data-edit-iso for tooling, but humans get the same wording as the
        // message timestamps instead of "2026-08-14T07:16:07.422Z".
        const editedAtLabel = (0, utils_1.formatMessageTimestamp)(message.editedAt, context?.timestampFormat, t(context, 'yesterdayAt', 'Yesterday at {time}'));
        const editedAtTitle = editedAtLabel
            ? t(context, 'editedAt', 'Edited at {time}').replace('{time}', editedAtLabel)
            : undefined;
        const pinned = !!message.pinned;

        // Forum applied tags — only on the first message of a forum thread (the post itself)
        let appliedTagPills = null;
        if (message.channel?.isThread?.() && message.channel.parent?.availableTags && Array.isArray(message.channel.appliedTags) && message.channel.appliedTags.length > 0) {
            const isFirstInThread = message.id === message.channel.id; // Forum post: thread id === starter message id
            if (isFirstInThread) {
                const available = message.channel.parent.availableTags;
                appliedTagPills = (0, jsx_runtime_1.jsx)("div", {
                    className: "dht-applied-tags",
                    children: message.channel.appliedTags.map((tagId) => {
                        const tag = available.find((t) => t.id === tagId);
                        if (!tag) return null;
                        return (0, jsx_runtime_1.jsxs)("span", { className: "dht-tag-pill", children: [
                            tag.emoji?.name && (0, jsx_runtime_1.jsx)("span", { className: "dht-tag-emoji", children: tag.emoji.name }),
                            ' ',
                            tag.name
                        ] }, tagId);
                    })
                });
            }
        }

        // Slash command interaction data is attached to <discord-command> as
        // data attributes so the popup can show parameters Discord-style. We
        // no longer render a separate "/cmd opt:val by user" line.
        const slashData = buildSlashCommandData(message);

        // The timestamp is formatted here rather than handed to <discord-message>
        // as a Date or ISO string. Skyra's converter only formats real Date
        // objects — an attribute always arrives as a string, so it passed the raw
        // "2026-08-14T07:16:07.422Z" straight through to the page. Preformatting
        // also lets us match Discord's own today/yesterday/date wording and honour
        // the dateFormat + timeFormat options.
        const createdAtIso = message.createdAt instanceof Date
            ? message.createdAt.toISOString()
            : (typeof message.createdAt === 'string' ? message.createdAt : undefined);
        const timestampLabel = (0, utils_1.formatMessageTimestamp)(message.createdAt, context?.timestampFormat, t(context, 'yesterdayAt', 'Yesterday at {time}'));

        return ((0, jsx_runtime_1.jsxs)("discord-message", {
            id: `m-${message.id}`,
            timestamp: timestampLabel,
            edited: message.editedAt !== null,
            server: (isCrossGuildReply || isCrosspost || isCrossposted) ? true : undefined,
            highlight: message.mentions.everyone || pinned,
            profile: message.author.id,
            className: pinned ? 'dht-msg dht-msg-pinned' : 'dht-msg',
            "data-author-id": message.author.id,
            "data-author-name": authorName,
            "data-roles": memberRoleIds,
            "data-timestamp": ts ? String(ts) : undefined,
            "data-timestamp-iso": createdAtIso,
            "data-text": lowerText,
            "data-pinned": pinned ? 'true' : undefined,
            "data-has-image": hasImage ? 'true' : undefined,
            "data-has-embed": hasEmbed ? 'true' : undefined,
            "data-has-attachment": hasAttachment ? 'true' : undefined,
            "data-has-component-v2": hasComponentV2 ? 'true' : undefined,
            children: [
                appliedTagPills,
                (0, jsx_runtime_1.jsx)(reply_1.default, { message: message, context: context }),
                message.interaction && ((0, jsx_runtime_1.jsx)("discord-command", {
                    slot: "reply",
                    profile: message.interaction.user.id,
                    command: (slashData && slashData.cmd) || ('/' + message.interaction.commandName),
                    className: "dht-slash-clickable",
                    "data-slash-cmd": slashData ? slashData.cmd : ('/' + message.interaction.commandName),
                    "data-slash-by": slashData ? slashData.by : '',
                    "data-slash-by-id": slashData ? slashData.byId : message.interaction.user.id,
                    "data-slash-options": JSON.stringify((slashData && slashData.opts) || []),
                })),
                isCrossposted && (0, jsx_runtime_1.jsx)("span", { className: "dht-badge dht-badge-crosspost", title: "Published from announcement channel", children: '📣 Published' }),
                isCrosspost && (0, jsx_runtime_1.jsx)("span", { className: "dht-badge dht-badge-crosspost", title: "Follows another channel", children: '📡 Follow' }),
                isSilent && (0, jsx_runtime_1.jsx)("span", { className: "dht-badge dht-badge-silent", title: "Silent message (no notification)", children: '🔕 Silent' }),
                activity && (0, jsx_runtime_1.jsxs)("div", { className: "dht-activity", children: [
                    (0, jsx_runtime_1.jsx)("span", { className: "dht-activity-icon", children: '🎮' }),
                    (0, jsx_runtime_1.jsxs)("span", { children: [activity.type, ' invite', activity.partyId ? ` · Party ${activity.partyId.slice(-6)}` : ''] })
                ] }),
                editedAtIso && (0, jsx_runtime_1.jsx)("span", { className: "dht-edit-marker", title: editedAtTitle || editedAtIso, "data-edit-iso": editedAtIso, "data-i18n": "edited", "data-i18n-params": JSON.stringify({ time: editedAtLabel || editedAtIso }), children: '(' + t(context, 'edited', 'edited') + ')' }),
                Array.isArray(message.editHistory) && message.editHistory.length > 0 && renderEditHistory(message.editHistory, context),
                snapshots.length > 0
                    ? renderSnapshots(snapshots, context, 0, forwardSource)
                    // A forward whose snapshot is missing still says what it is
                    // instead of rendering as an empty message.
                    : isForward && (0, jsx_runtime_1.jsx)("div", { className: "dht-forwarded-wrap", children: (0, jsx_runtime_1.jsx)("div", { className: "dht-forwarded", "data-depth": 0, children: (0, jsx_runtime_1.jsxs)("div", { className: "dht-forwarded-head", children: [
                        (0, jsx_runtime_1.jsx)("span", { className: "dht-forwarded-icon", children: '↪' }),
                        (0, jsx_runtime_1.jsx)("em", { "data-i18n": "forwardUnavailable", children: t(context, 'forwardUnavailable', 'Forwarded message is unavailable') }),
                    ] }) }) }),
                message.content && ((0, jsx_runtime_1.jsx)(content_1.default, { content: message.content, context: Object.assign({}, context, { type: message.webhookId ? content_1.RenderType.WEBHOOK : content_1.RenderType.NORMAL }) })),
                (0, jsx_runtime_1.jsx)(attachment_1.Attachments, { message: message, context: context }),
                isVoice && renderVoiceIndicator(message, context),
                stickers.length > 0 && renderStickers(stickers),
                poll && renderPoll(poll, context),
                !suppressEmbeds && message.embeds.map((embed, id) => ((0, jsx_runtime_1.jsx)(embed_1.DiscordEmbed, { embed: embed, context: Object.assign({}, context, { index: id, message }) }, id))),
                suppressEmbeds && message.embeds.length > 0 && (0, jsx_runtime_1.jsx)("span", { className: "dht-suppressed", "data-i18n": "suppressedEmbeds", children: t(context, 'suppressedEmbeds', '(embeds hidden)') }),
                message.components.length > 0 && ((0, jsx_runtime_1.jsx)("discord-attachments", { slot: "components", children: message.components.map((component, id) => ((0, jsx_runtime_1.jsx)(components_1.default, { id: id, component: component, context: context }, id))) })),
                message.reactions.cache.size > 0 && ((0, jsx_runtime_1.jsx)("discord-reactions", {
                    slot: "reactions",
                    children: Array.from(message.reactions.cache.values()).map((reaction, id) => {
                        const total = reaction.count ?? 0;
                        // discord.js names these countDetails and burstColors. The snake_case
                        // reads only ever matched raw API JSON, so super reactions never
                        // showed in production; raw shapes still work as a fallback.
                        const burstCount = reaction.countDetails?.burst || reaction.count_details?.burst || reaction.burst_count || 0;
                        const burst = burstCount > 0;
                        const rawBurstColors = reaction.burstColors ?? reaction.burst_colors;
                        const burstColors = Array.isArray(rawBurstColors) && rawBurstColors.length
                            ? rawBurstColors.filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c))
                            : [];
                        const title = burst
                            ? `${total} reactions (${burstCount} super)`
                            : `${total} reaction${total !== 1 ? 's' : ''}`;
                        const style = burst && burstColors.length
                            ? { boxShadow: `inset 0 0 0 2px ${burstColors[0]}` }
                            : undefined;
                        return ((0, jsx_runtime_1.jsx)("discord-reaction", {
                            name: reaction.emoji?.name || ':unknown:',
                            emoji: (0, utils_1.parseDiscordEmoji)(reaction.emoji) || undefined,
                            // <discord-reaction> declares `count` as a Number and renders
                            // it as one: an abbreviated "1.5K" showed up as NaN.
                            count: total,
                            title,
                            "data-burst": burst ? 'true' : undefined,
                            className: burst ? 'dht-reaction--burst' : undefined,
                            style,
                        }, `${message.id}r${id}`));
                    })
                })),
                message.hasThread && message.thread && renderThread(message.thread, context),
            ]
        }, message.id));
    } catch (err) {
        console.warn('[discord-html-transcripts-fix] Render failed', message?.id, err);
        const safeAuthor = (message?.author?.displayName || message?.author?.username) || 'Unknown';
        return ((0, jsx_runtime_1.jsx)("discord-message", { id: `m-${message?.id}`, children: (0, jsx_runtime_1.jsx)("span", { style: { opacity: 0.6 }, children: `[message from ${safeAuthor} failed to render]` }) }, message?.id));
    }
}

function renderThread(thread, context) {
    const cta = thread.messageCount
        ? `${thread.messageCount} Message${thread.messageCount > 1 ? 's' : ''}`
        : 'View Thread';
    const badges = [];
    if (thread.archived) badges.push((0, jsx_runtime_1.jsx)("span", { className: "dht-thread-badge dht-thread-badge--archived", "data-i18n": "threadArchived", children: t(context, 'threadArchived', 'Archived') }, 'a'));
    if (thread.locked) badges.push((0, jsx_runtime_1.jsx)("span", { className: "dht-thread-badge dht-thread-badge--locked", "data-i18n": "threadLocked", children: t(context, 'threadLocked', 'Locked') }, 'l'));
    return (0, jsx_runtime_1.jsxs)("discord-thread", { slot: "thread", name: thread.name, cta, children: [
        badges,
        thread.lastMessage
            ? (0, jsx_runtime_1.jsx)("discord-thread-message", { profile: thread.lastMessage.author.id, children: (0, jsx_runtime_1.jsx)(content_1.default, { content: thread.lastMessage.content.length > 128 ? thread.lastMessage.content.substring(0, 125) + '...' : thread.lastMessage.content, context: Object.assign({}, context, { type: content_1.RenderType.REPLY }) }) })
            : 'Thread messages not saved.'
    ] });
}

function renderStickers(stickers) {
    return (0, jsx_runtime_1.jsx)("div", {
        className: "dht-stickers",
        children: stickers.map((s) => {
            // Discord sticker formats: 1=PNG, 2=APNG (animated png), 3=Lottie (JSON), 4=GIF
            const format = s.format;
            const baseUrl = `https://media.discordapp.net/stickers/${s.id}`;
            if (format === 3) {
                // Lottie — render as iframe to discord's lottie player CDN page, or fallback link
                return (0, jsx_runtime_1.jsxs)("div", { className: "dht-sticker dht-sticker--lottie", title: s.name || '', children: [
                    (0, jsx_runtime_1.jsx)("div", { className: "dht-sticker-placeholder", children: '🎞️' }),
                    (0, jsx_runtime_1.jsxs)("span", { className: "dht-sticker-name", children: [s.name || 'sticker', ' (Lottie)'] })
                ] }, s.id);
            }
            if (format === 4) {
                return (0, jsx_runtime_1.jsx)("img", { src: s.url || `${baseUrl}.gif`, alt: s.name || 'sticker', title: s.name || '', className: "dht-sticker" }, s.id);
            }
            if (format === 2) {
                return (0, jsx_runtime_1.jsx)("img", { src: s.url || `${baseUrl}.png`, alt: s.name || 'sticker', title: s.name || '', className: "dht-sticker dht-sticker--apng" }, s.id);
            }
            return (0, jsx_runtime_1.jsx)("img", { src: s.url || `${baseUrl}.png`, alt: s.name || 'sticker', title: s.name || '', className: "dht-sticker" }, s.id);
        })
    });
}

function renderPoll(poll, context) {
    let totalVotes = 0;
    const answers = poll.answers ? Array.from(poll.answers.values()) : [];
    for (const a of answers) totalVotes += a.voteCount || 0;
    const locale = context?.lang === 'de' ? 'de-DE' : 'en-US';
    const expires = poll.expiresAt instanceof Date ? poll.expiresAt.toLocaleString(locale) : '';

    return (0, jsx_runtime_1.jsxs)("div", {
        className: "dht-poll",
        children: [
            (0, jsx_runtime_1.jsxs)("div", { className: "dht-poll-q", children: ['📊 ', poll.question?.text || 'Poll'] }),
            (0, jsx_runtime_1.jsx)("div", {
                className: "dht-poll-answers",
                children: answers.map((a, i) => {
                    const text = a.text ?? a.media?.text ?? `Option ${i + 1}`;
                    const votes = a.voteCount || 0;
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    return (0, jsx_runtime_1.jsxs)("div", { className: "dht-poll-a", children: [
                        (0, jsx_runtime_1.jsx)("div", { className: "dht-poll-bar", style: { width: pct + '%' } }),
                        (0, jsx_runtime_1.jsxs)("div", { className: "dht-poll-line", children: [
                            (0, jsx_runtime_1.jsx)("span", { children: String(text) }),
                            (0, jsx_runtime_1.jsxs)("span", { className: "dht-poll-pct", children: [votes, ' (', pct, '%)'] })
                        ] })
                    ] }, i);
                })
            }),
            (0, jsx_runtime_1.jsxs)("div", { className: "dht-poll-foot", children: [totalVotes, ' votes', expires ? ' · ends ' + expires : ''] })
        ]
    });
}

function renderVoiceIndicator(message, context) {
    // FIX: discord.js Collection.find takes a predicate but on Map it conflicts; iterate values explicitly.
    let audio = null;
    if (message.attachments && typeof message.attachments.values === 'function') {
        for (const a of message.attachments.values()) {
            if (typeof a.contentType === 'string' && a.contentType.startsWith('audio/')) { audio = a; break; }
        }
    }
    // discord.js exposes the raw `duration_secs` as `duration`.
    const duration = audio?.duration || audio?.duration_secs || audio?.durationSecs;
    const waveformB64 = audio?.waveform;
    let waveformRects = null;
    let waveformWidth = 0;
    if (typeof waveformB64 === 'string' && waveformB64.length > 0 && waveformB64.length < 16384) {
        try {
            const buf = Buffer.from(waveformB64, 'base64');
            const bars = Array.from(buf).slice(0, 100);
            const max = bars.length ? Math.max(1, ...bars) : 1;
            waveformWidth = bars.length * 3;
            waveformRects = bars.map((b, i) => {
                const h = Math.max(2, (b / max) * 20);
                return (0, jsx_runtime_1.jsx)("rect", { x: i * 3, y: (22 - h) / 2, width: 2, height: h, rx: 1, fill: "#5865F2" }, i);
            });
        } catch (_e) { waveformRects = null; }
    }
    return (0, jsx_runtime_1.jsxs)("div", { className: "dht-voice", children: [
        (0, jsx_runtime_1.jsx)("span", { className: "dht-voice-icon", children: '🎤' }),
        (0, jsx_runtime_1.jsx)("span", { className: "dht-voice-label", "data-i18n": "voiceMessage", children: t(context, 'voiceMessage', 'Voice message') }),
        waveformRects && (0, jsx_runtime_1.jsx)("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: `0 0 ${waveformWidth} 22`,
            width: waveformWidth,
            height: 22,
            className: "dht-voice-wave",
            children: waveformRects,
        }),
        duration ? (0, jsx_runtime_1.jsxs)("span", { className: "dht-voice-dur", children: [Math.round(duration), 's'] }) : null,
    ] });
}

function toArray(maybeColl) {
    if (!maybeColl) return [];
    if (Array.isArray(maybeColl)) return maybeColl;
    if (typeof maybeColl.values === 'function') return Array.from(maybeColl.values());
    if (typeof maybeColl === 'object') return Object.values(maybeColl);
    return [];
}

function renderSnapshots(snapshots, context, depth = 0, source = null) {
    const arr = toArray(snapshots);
    if (arr.length === 0 || depth >= 5) return null; // hard-cap at 5 levels
    return (0, jsx_runtime_1.jsx)("div", {
        className: "dht-forwarded-wrap",
        children: arr.map((snap, i) => {
            const m = snap.message || snap;
            // Discord deliberately hides who wrote a forwarded message, and the API
            // snapshot has no author. discord.js still builds each snapshot in the
            // source channel's message cache, so when the bot has the original
            // cached, the snapshot IS the original — author included, even from
            // another server. Only plain-object input, whose author the caller
            // supplied on purpose, may name one.
            const fromLibrary = (0, utils_1.isLibraryStructure)(m);
            const author = fromLibrary ? null : (m?.author?.displayName || m?.author?.username || null);
            const origin = author || source;
            const text = m?.content || '';
            const attachments = toArray(m?.attachments);
            const nested = toArray(m?.messageSnapshots);
            const embeds = toArray(m?.embeds);
            // Raw component shapes are not what the component renderer is written
            // for, so plain-object input keeps showing only what it showed before.
            const components = fromLibrary ? toArray(m?.components) : [];
            const stickers = toArray(m?.stickers).map((s) => ({
                id: s.id,
                name: s.name,
                url: s.url || `https://media.discordapp.net/stickers/${s.id}.png`,
                format: s.format,
            }));
            return (0, jsx_runtime_1.jsxs)("div", { className: "dht-forwarded", "data-depth": depth, children: [
                (0, jsx_runtime_1.jsxs)("div", { className: "dht-forwarded-head", children: [
                    (0, jsx_runtime_1.jsx)("span", { className: "dht-forwarded-icon", children: '↪' }),
                    // Without a known origin just say "Forwarded" rather than an
                    // unlocalised "Forwarded from Unknown".
                    origin
                        ? (0, jsx_runtime_1.jsx)("span", { "data-i18n": "forwardedFrom", children: t(context, 'forwardedFrom', 'Forwarded from') })
                        : (0, jsx_runtime_1.jsx)("span", { "data-i18n": "forwardedMessage", children: t(context, 'forwardedMessage', 'Forwarded') }),
                    origin && (0, jsx_runtime_1.jsx)("strong", { children: ' ' + origin }),
                ] }),
                text && (0, jsx_runtime_1.jsx)("div", { className: "dht-forwarded-body", children: (0, jsx_runtime_1.jsx)(content_1.default, { content: text, context: Object.assign({}, context, { type: content_1.RenderType.NORMAL }) }) }),
                // discord.js attachments take the same path as a message's own, so
                // saveImages and a custom resolveImageSrc archive forwarded images too
                // instead of leaving them on Discord's expiring CDN links.
                fromLibrary && attachments.length > 0 && (0, jsx_runtime_1.jsx)("div", { className: "dht-forwarded-media", children: (0, jsx_runtime_1.jsx)(attachment_1.Attachments, { message: m, context: context }) }),
                !fromLibrary && attachments.length > 0 && (0, jsx_runtime_1.jsxs)("div", { className: "dht-forwarded-attachments", children: [
                    (0, jsx_runtime_1.jsxs)("strong", { children: ['📎 ', attachments.length, ' attachment', attachments.length !== 1 ? 's' : '', ':'] }),
                    (0, jsx_runtime_1.jsx)("ul", { children: attachments.map((a, ai) => {
                        const safeUrl = (0, utils_1.safeHref)(a.url);
                        return (0, jsx_runtime_1.jsxs)("li", { children: [
                            a.contentType?.startsWith?.('image/') && a.url
                                ? (0, jsx_runtime_1.jsx)("img", { src: safeUrl !== '#' ? safeUrl : '', alt: a.name || '', style: { maxWidth: '200px', borderRadius: '4px', display: 'block', margin: '4px 0' } })
                                : (0, jsx_runtime_1.jsxs)("a", { href: safeUrl, target: "_blank", rel: "noreferrer", children: [a.name || 'attachment', a.size ? ` (${Math.round(a.size / 1024)} KB)` : ''] })
                        ] }, ai);
                    }) })
                ] }),
                stickers.length > 0 && renderStickers(stickers),
                // Forwarded embeds and components render in full, like Discord shows them.
                fromLibrary && embeds.length > 0 && (0, jsx_runtime_1.jsx)("div", { className: "dht-forwarded-media", children: embeds.map((embed, ei) => (0, jsx_runtime_1.jsx)(embed_1.DiscordEmbed, { embed: embed, context: Object.assign({}, context, { index: ei, message: m }) }, ei)) }),
                !fromLibrary && embeds.length > 0 && (0, jsx_runtime_1.jsxs)("div", { className: "dht-forwarded-embeds", children: ['📑 ', embeds.length, ' embed', embeds.length !== 1 ? 's' : ''] }),
                components.length > 0 && (0, jsx_runtime_1.jsx)("div", { className: "dht-forwarded-media", children: (0, jsx_runtime_1.jsx)("discord-attachments", { children: components.map((component, ci) => (0, jsx_runtime_1.jsx)(components_1.default, { id: ci, component: component, context: context }, ci)) }) }),
                nested.length > 0 && renderSnapshots(nested, context, depth + 1),
            ] }, i);
        })
    });
}

const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_SECTION = 9;
const COMPONENT_TYPE_THUMBNAIL = 11;
const COMPONENT_TYPE_MEDIA_GALLERY = 12;
const COMPONENT_TYPE_FILE = 13;
const COMPONENT_TYPE_CONTAINER = 17;
const FLAG_IS_COMPONENTS_V2 = 1 << 15;

// Walks message.embeds and message.components to determine whether the message
// carries media or V2 containers — used to drive the filter checkboxes
// (data-has-image, data-has-attachment, data-has-embed, data-has-component-v2).
function detectMediaFlags(message, out = { hasImage: false, hasAttachment: false, hasEmbed: false, hasComponentV2: false }, depth = 0) {

    // Direct attachments
    if (message.attachments && typeof message.attachments.values === 'function') {
        for (const a of message.attachments.values()) {
            out.hasAttachment = true;
            const ct = typeof a.contentType === 'string' ? a.contentType : '';
            if (ct.startsWith('image/') || ct.startsWith('video/')) out.hasImage = true;
        }
    }

    // Classic embeds
    if (Array.isArray(message.embeds)) {
        for (const e of message.embeds) {
            if (!e) continue;
            out.hasEmbed = true;
            if (e.image || e.thumbnail) out.hasImage = true;
            if (e.video && (e.video.url || e.video.proxyURL || e.video.proxy_url)) out.hasImage = true;
        }
    }

    // Components V2 — message-level flag and recursive walk
    const flags = (typeof message.flags?.bitfield === 'number') ? message.flags.bitfield : 0;
    if (flags & FLAG_IS_COMPONENTS_V2) out.hasComponentV2 = true;

    const walk = (comp) => {
        if (!comp || typeof comp.type !== 'number') return;
        switch (comp.type) {
            case COMPONENT_TYPE_CONTAINER:
                out.hasComponentV2 = true;
                if (Array.isArray(comp.components)) for (const c of comp.components) walk(c);
                break;
            case COMPONENT_TYPE_SECTION:
                if (Array.isArray(comp.components)) for (const c of comp.components) walk(c);
                if (comp.accessory) walk(comp.accessory);
                break;
            case COMPONENT_TYPE_ACTION_ROW:
                if (Array.isArray(comp.components)) for (const c of comp.components) walk(c);
                break;
            case COMPONENT_TYPE_MEDIA_GALLERY:
                if (Array.isArray(comp.items) && comp.items.length > 0) out.hasImage = true;
                break;
            case COMPONENT_TYPE_THUMBNAIL:
                if (comp.media && (comp.media.url || comp.media.proxy_url || comp.media.proxyURL)) out.hasImage = true;
                break;
            case COMPONENT_TYPE_FILE:
                out.hasAttachment = true;
                if (comp.file && typeof comp.file.url === 'string' && /\.(png|jpe?g|gif|webp|bmp|svg|mp4|webm|mov)(\?|$)/i.test(comp.file.url)) out.hasImage = true;
                break;
            default:
                if (Array.isArray(comp.components)) for (const c of comp.components) walk(c);
                break;
        }
    };
    if (Array.isArray(message.components)) for (const c of message.components) walk(c);

    // What a forward carries counts for the "has image/attachment/embed" filters too.
    if (depth < 5) {
        for (const snap of toArray(message.messageSnapshots)) {
            const inner = snap?.message || snap;
            if (inner) detectMediaFlags(inner, out, depth + 1);
        }
    }

    return out;
}

function buildSlashCommandData(message) {
    const interaction = message?.interaction;
    const metadata = message?.interactionMetadata;
    const optsRaw = message?.interactionOptions || interaction?.options;
    if (!interaction && !metadata) return null;

    let cmdParts = [interaction?.commandName || metadata?.name || '?'];
    let valueOpts = Array.isArray(optsRaw) ? optsRaw : [];

    // Walk subcommand-group → subcommand nesting.
    for (let i = 0; i < 2; i++) {
        if (valueOpts.length === 1 && valueOpts[0] && (valueOpts[0].type === 1 || valueOpts[0].type === 2)) {
            cmdParts.push(valueOpts[0].name);
            valueOpts = Array.isArray(valueOpts[0].options) ? valueOpts[0].options : [];
        }
    }
    valueOpts = valueOpts.filter((o) => o && !o.focused);

    const triggeredBy = metadata?.user || interaction?.user || null;
    const opts = valueOpts.map((o) => ({
        name: String(o.name ?? ''),
        value: o.value == null ? '' : String(o.value),
        type: typeof o.type === 'number' ? o.type : null,
    }));

    return {
        cmd: '/' + cmdParts.filter(Boolean).join(' '),
        opts,
        by: triggeredBy ? (triggeredBy.displayName || triggeredBy.username || triggeredBy.id || '') : '',
        byId: triggeredBy ? (triggeredBy.id || '') : '',
    };
}

function renderEditHistory(history, context) {
    // Optional feature — host bot may attach `message.editHistory: [{content, editedAt}, …]`
    return (0, jsx_runtime_1.jsxs)("details", { className: "dht-edit-history", children: [
        (0, jsx_runtime_1.jsx)("summary", { "data-i18n": "editHistoryTitle", children: t(context, 'editHistoryTitle', 'Edit history') }),
        (0, jsx_runtime_1.jsx)("ol", { children: history.map((entry, i) => {
            const when = entry.editedAt instanceof Date ? entry.editedAt.toISOString() : (typeof entry.editedAt === 'string' ? entry.editedAt : '');
            return (0, jsx_runtime_1.jsxs)("li", { children: [
                when && (0, jsx_runtime_1.jsxs)("time", { dateTime: when, children: [t(context, 'editHistoryAt', 'at'), ' ', when] }),
                (0, jsx_runtime_1.jsx)("div", { children: String(entry.content || '') })
            ] }, i);
        }) })
    ] });
}
//# sourceMappingURL=message.js.map

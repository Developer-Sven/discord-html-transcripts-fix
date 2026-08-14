"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SystemMessage;
exports.Highlight = Highlight;
exports.JoinMessage = JoinMessage;
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_js_1 = require("discord.js");
const utils_1 = require("../../utils/utils");

function t(context, key, fallback) {
    const dict = context?.i18n?.[context?.lang] || context?.i18n?.en || {};
    return dict[key] || fallback || key;
}

async function SystemMessage({ message, context }) {
    const author = message.author;
    const authorName = author?.displayName ?? author?.username ?? 'Unknown';
    const color = message.member?.roles?.color?.hexColor;
    const authorId = author?.id;
    const ctx = context || {};
    // Preformatted for the same reason as in message.js: skyra only formats real
    // Date objects, and an attribute always arrives as a string — so an ISO value
    // was rendered verbatim. This also keeps system messages worded like the
    // regular ones (today / yesterday / full date).
    const ts = (0, utils_1.formatMessageTimestamp)(message.createdAt, ctx.timestampFormat, t(ctx, 'yesterdayAt', 'Yesterday at {time}'));

    switch (message.type) {
        case discord_js_1.MessageType.RecipientAdd:
        case discord_js_1.MessageType.UserJoin:
            return ((0, jsx_runtime_1.jsx)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "join", children: (0, jsx_runtime_1.jsx)(JoinMessage, { member: message.member, fallbackUser: author, seed: message.id, context: ctx }) }, message.id));

        case discord_js_1.MessageType.ChannelPinnedMessage: {
            const refId = message.reference?.messageId;
            // Discord renders this as: "{user} pinned {a message} to this channel."
            // where "a message" is the clickable jump link. The i18n key `pinned`
            // accepts a `{message}` placeholder; if absent (legacy dict), we fall
            // back to flat text + a trailing " (jump)".
            const template = t(ctx, 'pinned', 'pinned {message} to this channel.');
            const linkLabel = t(ctx, 'pinnedLink', 'a message');
            const linkEl = refId
                ? (0, jsx_runtime_1.jsx)("i", { "data-goto": refId, className: "dht-jump", role: "button", tabIndex: 0, children: linkLabel })
                : (0, jsx_runtime_1.jsx)("strong", { children: linkLabel });
            const parts = template.includes('{message}') ? template.split('{message}') : null;
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "pin", children: parts
                ? [
                    (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                    ' ',
                    parts[0],
                    linkEl,
                    parts[1],
                ]
                : [
                    (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                    ' ',
                    (0, jsx_runtime_1.jsx)("span", { "data-i18n": "pinned", children: template }),
                    refId ? (0, jsx_runtime_1.jsx)("i", { "data-goto": refId, className: "dht-jump", role: "button", tabIndex: 0, children: " (jump)" }) : null,
                ]
            }, message.id));
        }

        case discord_js_1.MessageType.GuildBoost:
        case discord_js_1.MessageType.GuildBoostTier1:
        case discord_js_1.MessageType.GuildBoostTier2:
        case discord_js_1.MessageType.GuildBoostTier3:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "boost", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "boosted", children: t(ctx, 'boosted', 'boosted the server!') }),
            ] }, message.id));

        case discord_js_1.MessageType.ThreadStarterMessage:
        case discord_js_1.MessageType.ThreadCreated: {
            const refId = message.reference?.messageId;
            const label = message.content || 'New thread';
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "thread", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "threadStarted", children: t(ctx, 'threadStarted', 'started a thread:') }),
                ' ',
                refId
                    ? (0, jsx_runtime_1.jsx)("i", { "data-goto": refId, className: "dht-jump", role: "button", tabIndex: 0, children: label })
                    : (0, jsx_runtime_1.jsx)("i", { children: label }),
            ] }, message.id));
        }

        case discord_js_1.MessageType.ChannelNameChange:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "edit", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "changedChannelName", children: t(ctx, 'changedChannelName', 'changed the channel name:') }),
                ' ',
                (0, jsx_runtime_1.jsx)("strong", { children: message.content }),
            ] }, message.id));

        case discord_js_1.MessageType.ChannelIconChange:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "edit", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "changedChannelIcon", children: t(ctx, 'changedChannelIcon', 'changed the channel icon.') }),
            ] }, message.id));

        case discord_js_1.MessageType.ChatInputCommand:
        case discord_js_1.MessageType.ContextMenuCommand: {
            const cmd = message.interaction?.commandName ? '/' + message.interaction.commandName : 'a command';
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "call", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "usedCommand", children: t(ctx, 'usedCommand', 'used') }),
                ' ',
                (0, jsx_runtime_1.jsx)("strong", { children: cmd }),
            ] }, message.id));
        }

        case discord_js_1.MessageType.Call:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "call", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "startedCall", children: t(ctx, 'startedCall', 'started a call.') }),
            ] }, message.id));

        case discord_js_1.MessageType.ChannelFollowAdd: {
            const followText = t(ctx, 'addedFollow', 'added {target} to follow this channel.');
            const parts = followText.split('{target}');
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "edit", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                parts[0],
                (0, jsx_runtime_1.jsxs)("span", { className: "dht-mention dht-mention--channel", children: ['#', message.content || 'channel'] }),
                parts[1] || '',
            ] }, message.id));
        }

        case discord_js_1.MessageType.RecipientRemove:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "leave", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "left", children: t(ctx, 'left', 'left.') }),
            ] }, message.id));

        case discord_js_1.MessageType.AutoModerationAction: {
            // Discord packs detail into the first embed: rule_name, matched_keyword, action_type, channel_id
            const e = message.embeds?.[0];
            const fields = Array.isArray(e?.fields) ? e.fields : [];
            const ruleName = fields.find((f) => /rule_name|rule name/i.test(f.name))?.value || e?.title || '';
            const matchedKeyword = fields.find((f) => /matched_keyword|keyword/i.test(f.name))?.value || '';
            const action = fields.find((f) => /action_type|action/i.test(f.name))?.value || '';
            const blocked = e?.description || '';
            const channelId = fields.find((f) => /channel/i.test(f.name))?.value;
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "boost", children: [
                (0, jsx_runtime_1.jsx)("span", { "data-i18n": "autoModBlocked", children: t(ctx, 'autoModBlocked', 'AutoMod blocked a message.') }),
                ruleName && (0, jsx_runtime_1.jsxs)("span", { className: "dht-automod-rule", children: [' · Rule: ', (0, jsx_runtime_1.jsx)("strong", { children: ruleName })] }),
                action && (0, jsx_runtime_1.jsxs)("span", { className: "dht-automod-rule", children: [' · Action: ', action] }),
                matchedKeyword && (0, jsx_runtime_1.jsxs)("span", { className: "dht-automod-rule", children: [' · Matched: ', (0, jsx_runtime_1.jsx)("code", { children: matchedKeyword })] }),
                blocked && (0, jsx_runtime_1.jsx)("blockquote", { className: "dht-automod-content", children: blocked }),
                channelId && (0, jsx_runtime_1.jsxs)("span", { className: "dht-automod-rule", children: [' · In <#', channelId, '>'] }),
            ] }, message.id));
        }
        case discord_js_1.MessageType.StageStart:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "call", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' started a stage: ',
                (0, jsx_runtime_1.jsx)("strong", { children: message.content || '' })
            ] }, message.id));
        case discord_js_1.MessageType.StageEnd:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "leave", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ended the stage.'
            ] }, message.id));
        case discord_js_1.MessageType.StageSpeaker:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "call", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' is now a speaker.'
            ] }, message.id));
        case discord_js_1.MessageType.StageRaiseHand:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "call", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' requested to speak.'
            ] }, message.id));
        case discord_js_1.MessageType.StageTopic:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "edit", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' changed the stage topic: ',
                (0, jsx_runtime_1.jsx)("strong", { children: message.content || '' })
            ] }, message.id));
        case discord_js_1.MessageType.GuildApplicationPremiumSubscription:
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "boost", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' subscribed ',
                (0, jsx_runtime_1.jsx)("strong", { children: message.applicationId ? `app ${message.applicationId}` : 'an app' }),
                ' to this server.'
            ] }, message.id));

        case discord_js_1.MessageType.RoleSubscriptionPurchase: {
            const roleName = message.roleSubscriptionData?.tierName || message.content || 'a role';
            return ((0, jsx_runtime_1.jsxs)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "boost", children: [
                (0, jsx_runtime_1.jsx)(Highlight, { color, userId: authorId, children: authorName }),
                ' ',
                t(ctx, 'roleSubPurchased', 'subscribed to {role}!').replace('{role}', roleName),
            ] }, message.id));
        }

        case discord_js_1.MessageType.GuildIncidentReportRaid:
        case discord_js_1.MessageType.GuildIncidentReportFalseAlarm:
        case discord_js_1.MessageType.GuildIncidentAlertModeEnabled:
        case discord_js_1.MessageType.GuildIncidentAlertModeDisabled:
            return ((0, jsx_runtime_1.jsx)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "boost", children: (0, jsx_runtime_1.jsx)("span", { "data-i18n": "serverAlert", children: t(ctx, 'serverAlert', 'Server safety alert.') }) }, message.id));

        case discord_js_1.MessageType.PollResult:
            return ((0, jsx_runtime_1.jsx)("discord-system-message", { id: `m-${message.id}`, timestamp: ts, type: "edit", children: (0, jsx_runtime_1.jsx)("span", { "data-i18n": "pollEnded", children: t(ctx, 'pollEnded', 'A poll ended.') }) }, message.id));

        // These render through the normal pipeline
        case discord_js_1.MessageType.Default:
        case discord_js_1.MessageType.Reply:
            return undefined;

        default:
            return undefined;
    }
}

function Highlight({ children, color, userId }) {
    const safe = typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : 'white';
    const props = { style: { color: safe } };
    // Wire up the user popup the same way mentions and message authors do.
    if (typeof userId === 'string' && userId) {
        props.className = 'dht-sys-author';
        props['data-mention-type'] = 'user';
        props['data-mention-id'] = userId;
    }
    return (0, jsx_runtime_1.jsx)("i", Object.assign({}, props, { children }));
}

const allJoinMessages = [
    '{user} just joined the server - glhf!',
    '{user} just joined. Everyone, look busy!',
    '{user} just joined. Can I get a heal?',
    '{user} joined your party.',
    '{user} joined. You must construct additional pylons.',
    'Ermagherd. {user} is here.',
    'Welcome, {user}. Stay awhile and listen.',
    'Welcome, {user}. We were expecting you ( ͡° ͜ʖ ͡°)',
    'Welcome, {user}. We hope you brought pizza.',
    'Welcome {user}. Leave your weapons by the door.',
    'A wild {user} appeared.',
    'Swoooosh. {user} just landed.',
    'Brace yourselves {user} just joined the server.',
    '{user} just joined. Hide your bananas.',
    '{user} just arrived. Seems OP - please nerf.',
    '{user} just slid into the server.',
    'A {user} has spawned in the server.',
    'Big {user} showed up!',
    "Where's {user}? In the server!",
    '{user} hopped into the server. Kangaroo!!',
    '{user} just showed up. Hold my beer.',
    'Challenger approaching - {user} has appeared!',
    "It's a bird! It's a plane! Nevermind, it's just {user}.",
    "It's {user}! Praise the sun! \\\\[T]/",
    'Never gonna give {user} up. Never gonna let {user} down.',
    'Ha! {user} has joined! You activated my trap card!',
    'Cheers, love! {user} is here!',
    'Hey! Listen! {user} has joined!',
    "We've been expecting you {user}",
    "It's dangerous to go alone, take {user}!",
    "{user} has joined the server! It's super effective!",
    '{user} is here, as the prophecy foretold.',
    "{user} has arrived. Party's over.",
    'Ready player {user}',
    '{user} is here to kick butt and chew bubblegum. And {user} is all out of gum.',
    "Hello. Is it {user} you're looking for?",
];

// Deterministic — seed off message.id so the message text stays stable across re-renders.
function pickJoinMessage(seed) {
    if (!seed) return allJoinMessages[0];
    try {
        // Hash snowflake → index. BigInt safe for snowflakes.
        let n = 0;
        for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
        return allJoinMessages[n % allJoinMessages.length];
    } catch (_e) {
        return allJoinMessages[0];
    }
}

function JoinMessage({ member, fallbackUser, seed, context }) {
    const template = pickJoinMessage(seed);
    const uid = member?.id || fallbackUser?.id;
    return template
        .split('{user}')
        .flatMap((item, i) => [
            item,
            (0, jsx_runtime_1.jsx)(Highlight, { color: member?.roles?.color?.hexColor, userId: uid, children: member?.nickname ?? fallbackUser.displayName ?? fallbackUser.username }, i),
        ])
        .slice(0, -1);
}
//# sourceMappingURL=systemMessage.js.map

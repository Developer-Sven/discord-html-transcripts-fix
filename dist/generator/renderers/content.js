"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderType = void 0;
exports.default = MessageContent;
exports.MessageSingleASTNode = MessageSingleASTNode;
exports.getChannelType = getChannelType;
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_markdown_parser_1 = __importDefault(require("discord-markdown-parser"));
const discord_js_1 = require("discord.js");
const utils_1 = require("../../utils/utils");
const DiscordHighlightedCode_1 = require("./components/DiscordHighlightedCode");

var RenderType;
(function (RenderType) {
    RenderType[RenderType["EMBED"] = 0] = "EMBED";
    RenderType[RenderType["REPLY"] = 1] = "REPLY";
    RenderType[RenderType["NORMAL"] = 2] = "NORMAL";
    RenderType[RenderType["WEBHOOK"] = 3] = "WEBHOOK";
})(RenderType || (exports.RenderType = RenderType = {}));

function hexToRgba(hex, alpha) {
    if (typeof hex !== 'string') return null;
    let h = hex.replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// Discord-specific block-level markdown that discord-markdown-parser misses in inline mode.
// Run BEFORE the parser, extract heading/subtext lines, parse the rest, splice back together.
const HEADING_RE = /^(#{1,3})\s+(.+?)\s*$/;
const SUBTEXT_RE = /^-#\s+(.+?)\s*$/;
const CODE_FENCE_RE = /^```([a-zA-Z0-9_+-]*)\s*\n([\s\S]*?)```$/m;

function preParseDiscord(content, mode) {
    if (!content || typeof content !== 'string') return [];
    const lines = content.split('\n');
    const nodes = [];
    let inlineBuffer = '';
    let codeFenceActive = null; // {lang, lines}

    const flushInline = () => {
        if (!inlineBuffer) return;
        const parsed = discord_markdown_parser_1.default(inlineBuffer, mode);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        nodes.push(...arr);
        inlineBuffer = '';
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code fence — close only on `^\s*\`\`\`\s*$` (Discord-style: triple-backticks alone on line)
        if (codeFenceActive) {
            if (/^\s*```\s*$/.test(line)) {
                nodes.push({ type: 'codeBlock', lang: codeFenceActive.lang || '', content: codeFenceActive.lines.join('\n') });
                codeFenceActive = null;
            } else {
                codeFenceActive.lines.push(line);
            }
            continue;
        }
        const fenceMatch = line.match(/^```([a-zA-Z0-9_+-]*)\s*$/);
        if (fenceMatch) {
            flushInline();
            codeFenceActive = { lang: fenceMatch[1], lines: [] };
            continue;
        }

        const h = line.match(HEADING_RE);
        if (h) {
            flushInline();
            const level = h[1].length;
            const headingInner = discord_markdown_parser_1.default(h[2], mode);
            nodes.push({ type: 'heading', level, content: Array.isArray(headingInner) ? headingInner : [headingInner] });
            continue;
        }

        const s = line.match(SUBTEXT_RE);
        if (s) {
            flushInline();
            const innerNodes = discord_markdown_parser_1.default(s[1], mode);
            nodes.push({ type: 'subtext', content: Array.isArray(innerNodes) ? innerNodes : [innerNodes] });
            continue;
        }

        if (inlineBuffer) inlineBuffer += '\n';
        inlineBuffer += line;
    }
    if (codeFenceActive) {
        // unclosed fence — flush as text-ish
        inlineBuffer += '```' + (codeFenceActive.lang ? codeFenceActive.lang : '') + '\n' + codeFenceActive.lines.join('\n');
    }
    flushInline();
    return nodes;
}

async function MessageContent({ content, context }) {
    if (context.type === RenderType.REPLY && content.length > 180) {
        content = content.slice(0, 180) + '...';
    }
    const mode = context.type === RenderType.EMBED || context.type === RenderType.WEBHOOK ? 'extended' : 'normal';
    // REPLY mode is always inline-only (heading inside a reply preview makes no sense).
    // For all other modes (NORMAL/EMBED/WEBHOOK) we pre-process headings/subtext/code-fences
    // so they render correctly even though discord-markdown-parser is inline-only.
    const parsed = context.type === RenderType.REPLY
        ? discord_markdown_parser_1.default(content, mode)
        : preParseDiscord(content, mode);

    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    const isOnlyEmojis = nodes.every((node) => ['emoji', 'twemoji'].includes(node.type) || (node.type === 'text' && node.content.trim().length === 0));
    if (isOnlyEmojis) {
        const emojis = nodes.filter((node) => ['emoji', 'twemoji'].includes(node.type));
        if (emojis.length <= 25) {
            context._internal = { largeEmojis: true };
        }
    }
    return (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes, context });
}

async function MessageASTNodes({ nodes, context }) {
    if (Array.isArray(nodes)) {
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: nodes.map((node, i) => (0, jsx_runtime_1.jsx)(MessageSingleASTNode, { node, context }, i)) });
    }
    return (0, jsx_runtime_1.jsx)(MessageSingleASTNode, { node: nodes, context });
}

async function MessageSingleASTNode({ node, context }) {
    if (!node) return null;
    try {
        return await renderASTNode(node, context);
    } catch (err) {
        console.warn('[discord-html-transcripts-fix] AST node render failed:', err);
        try {
            if (typeof node.content === 'string') return node.content;
            if (Array.isArray(node.content)) return (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context });
        } catch (_e) {}
        return null;
    }
}

const GUIDE_LABELS = {
    'guide': 'Server Guide',
    'browse': 'Channels & Roles',
    'customize': 'Customize',
    'welcome': 'Welcome',
    'linked-roles': 'Linked Roles',
    'home': 'Home',
    'members': 'Members',
    'emoji': 'Emoji',
    'soundboard': 'Soundboard',
    'shop': 'Shop',
    'events': 'Events',
    'channel': 'Channels',
};

async function renderASTNode(node, context) {
    const type = node.type;
    switch (type) {
        case 'text':
            return node.content;
        case 'link':
            return (0, jsx_runtime_1.jsx)("discord-link", { href: (0, utils_1.safeHref)(node.target), children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        case 'url':
        case 'autolink':
            return (0, jsx_runtime_1.jsx)("discord-link", { href: (0, utils_1.safeHref)(node.target), target: "_blank", rel: "noreferrer", children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        case 'blockQuote':
            if (context.type === RenderType.REPLY) {
                return (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context });
            }
            return (0, jsx_runtime_1.jsx)("discord-quote", { children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        case 'br':
        case 'newline':
            if (context.type === RenderType.REPLY) return ' ';
            return (0, jsx_runtime_1.jsx)("br", {});

        // Headings: #/##/### in Discord. The discord-markdown-parser doesn't emit these
        // in inline mode, so preParseDiscord extracts them before the parser sees them.
        case 'heading': {
            const level = Math.max(1, Math.min(3, node.level || 1));
            const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
            return (0, jsx_runtime_1.jsx)(Tag, { className: `dht-heading dht-heading-${level}`, children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        }
        // Subtext: lines starting with `-# ` are small/dim text
        case 'subtext':
            return (0, jsx_runtime_1.jsx)("small", { className: "dht-subtext", children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });

        case 'channel': {
            const id = node.id;
            if (typeof id === 'string' && /^[a-z][a-z-]*$/.test(id)) {
                const label = GUIDE_LABELS[id] || id;
                return (0, jsx_runtime_1.jsx)("span", { className: "dht-mention dht-mention--channel", children: '#' + label });
            }
            const channel = await Promise.resolve(context.callbacks.resolveChannel(id)).catch(() => null);
            const name = channel ? (channel.isDMBased() ? 'DM Channel' : channel.name) : `unknown-${(id || '').slice(-6)}`;
            return (0, jsx_runtime_1.jsx)("span", {
                className: "dht-mention dht-mention--channel",
                "data-mention-type": "channel",
                "data-mention-id": id,
                children: '#' + name
            });
        }

        case 'role': {
            const id = node.id;
            const role = await Promise.resolve(context.callbacks.resolveRole(id)).catch(() => null);
            const name = role?.name ?? `role-${(id || '').slice(-6)}`;
            const color = role?.hexColor && role.hexColor !== '#000000' ? (0, utils_1.safeColor)(role.hexColor, undefined) : undefined;
            const bg = color ? hexToRgba(color, 0.18) : undefined;
            const style = color ? { color, backgroundColor: bg, borderColor: hexToRgba(color, 0.45) } : undefined;
            return (0, jsx_runtime_1.jsx)("span", {
                className: "dht-mention dht-mention--role",
                "data-mention-type": "role",
                "data-mention-id": id,
                style,
                children: '@' + name
            });
        }

        case 'user': {
            const id = node.id;
            const user = await Promise.resolve(context.callbacks.resolveUser(id)).catch(() => null);
            const name = user ? (user.displayName ?? user.username ?? `user-${(id || '').slice(-6)}`) : `user-${(id || '').slice(-6)}`;
            return (0, jsx_runtime_1.jsx)("span", {
                className: "dht-mention dht-mention--user",
                "data-mention-type": "user",
                "data-mention-id": id,
                children: '@' + name
            });
        }

        case 'slashCommand':
        case 'command': {
            const name = node.name || node.content || 'command';
            return (0, jsx_runtime_1.jsx)("span", { className: "dht-mention dht-mention--command", children: '/' + String(name) });
        }

        case 'guildNavigation': {
            const id = node.id || node.content || 'guide';
            const label = GUIDE_LABELS[id] || id;
            return (0, jsx_runtime_1.jsx)("span", { className: "dht-mention dht-mention--channel", children: '#' + label });
        }

        case 'here':
        case 'everyone':
            return (0, jsx_runtime_1.jsx)("span", { className: "dht-mention dht-mention--role dht-mention--highlight", children: '@' + type });

        case 'codeBlock':
            if (context.type !== RenderType.REPLY) {
                return (0, jsx_runtime_1.jsx)(DiscordHighlightedCode_1.DiscordHighlightedCode, { language: node.lang, content: node.content });
            }
            return (0, jsx_runtime_1.jsx)("code", { className: "dht-inline-code", children: node.content });
        case 'inlineCode':
            return (0, jsx_runtime_1.jsx)("code", { className: "dht-inline-code", children: node.content });

        case 'em':
            return (0, jsx_runtime_1.jsx)("em", { children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        case 'strong':
            return (0, jsx_runtime_1.jsx)("strong", { children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        case 'underline':
            return (0, jsx_runtime_1.jsx)("u", { children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        case 'strikethrough':
            return (0, jsx_runtime_1.jsx)("s", { children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });
        case 'emoticon':
            return typeof node.content === 'string' ? node.content : (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context });
        case 'spoiler':
            return (0, jsx_runtime_1.jsx)("span", { className: "discord-spoiler", children: (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context }) });

        case 'emoji':
        case 'twemoji': {
            const url = (0, utils_1.parseDiscordEmoji)(node);
            const jumbo = context._internal?.largeEmojis;
            return (0, jsx_runtime_1.jsx)("img", {
                className: jumbo ? "dht-emoji dht-emoji--jumbo" : "dht-emoji",
                src: url,
                alt: node.name || '',
                draggable: false
            });
        }

        case 'timestamp': {
            const raw = node.timestamp;
            let dateMs = NaN;
            if (typeof raw === 'number') {
                dateMs = raw < 1e12 ? raw * 1000 : raw;
            } else if (typeof raw === 'string') {
                const n = parseInt(raw, 10);
                if (Number.isFinite(n)) dateMs = n < 1e12 ? n * 1000 : n;
            }
            const dt = new Date(dateMs);
            if (!Number.isFinite(dt.getTime())) return (0, jsx_runtime_1.jsx)("span", { className: "dht-timestamp", children: "—" });
            const fmt = formatTimestamp(dt, node.format);
            return (0, jsx_runtime_1.jsx)("time", { className: "dht-timestamp", dateTime: dt.toISOString(), title: dt.toISOString(), children: fmt });
        }

        default:
            return typeof node.content === 'string' ? node.content : (0, jsx_runtime_1.jsx)(MessageASTNodes, { nodes: node.content, context });
    }
}

function formatTimestamp(dt, format) {
    // Discord formats: t (short time), T (long time), d (short date), D (long date), f (short datetime), F (long datetime), R (relative)
    try {
        if (format === 'R') {
            const diff = (dt.getTime() - Date.now()) / 1000;
            const abs = Math.abs(diff);
            const past = diff < 0;
            const pluralize = (n, unit) => Math.round(n) + ' ' + unit + (Math.round(n) !== 1 ? 's' : '');
            let val;
            if (abs < 60) val = pluralize(abs, 'second');
            else if (abs < 3600) val = pluralize(abs / 60, 'minute');
            else if (abs < 86400) val = pluralize(abs / 3600, 'hour');
            else if (abs < 2592000) val = pluralize(abs / 86400, 'day');
            else if (abs < 31536000) val = pluralize(abs / 2592000, 'month');
            else val = pluralize(abs / 31536000, 'year');
            return past ? `${val} ago` : `in ${val}`;
        }
        switch (format) {
            case 't': return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            case 'T': return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            case 'd': return dt.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
            case 'D': return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
            case 'F': return dt.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            case 'f':
            default: return dt.toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    } catch (_e) {
        return dt.toISOString();
    }
}

function getChannelType(channelType) {
    switch (channelType) {
        case discord_js_1.ChannelType.GuildCategory:
        case discord_js_1.ChannelType.GuildAnnouncement:
        case discord_js_1.ChannelType.GuildText:
        case discord_js_1.ChannelType.DM:
            return 'channel';
        case discord_js_1.ChannelType.GuildVoice:
        case discord_js_1.ChannelType.GuildStageVoice:
            return 'voice';
        case discord_js_1.ChannelType.AnnouncementThread:
        case discord_js_1.ChannelType.PublicThread:
        case discord_js_1.ChannelType.PrivateThread:
            return 'thread';
        case discord_js_1.ChannelType.GuildForum:
            return 'forum';
        default:
            return 'channel';
    }
}
//# sourceMappingURL=content.js.map

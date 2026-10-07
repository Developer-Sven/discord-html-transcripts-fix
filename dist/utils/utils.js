"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDefined = isDefined;
exports.formatBytes = formatBytes;
exports.parseDiscordEmoji = parseDiscordEmoji;
exports.streamToString = streamToString;
exports.safeJsonForScript = safeJsonForScript;
exports.safeHref = safeHref;
exports.safeImageSrc = safeImageSrc;
exports.safeColor = safeColor;
exports.safeImageMime = safeImageMime;
exports.escapeHtml = escapeHtml;
exports.resolveTimestampFormat = resolveTimestampFormat;
exports.formatMessageTimestamp = formatMessageTimestamp;
exports.isForwardReference = isForwardReference;
exports.isForwardMessage = isForwardMessage;
exports.isLibraryStructure = isLibraryStructure;
const discord_js_1 = require("discord.js");
const twemoji_1 = __importDefault(require("twemoji"));

// MessageReferenceType.Forward. Spelled as the API value on purpose: the enum only
// exists from discord.js 14.16, and reading it on an older 14.x throws for every
// message that has a reference.
const MESSAGE_REFERENCE_TYPE_FORWARD = 1;
// MessageFlags.HasSnapshot, for the same reason.
const MESSAGE_FLAG_HAS_SNAPSHOT = 1 << 14;

function isForwardReference(reference) {
    return !!reference && reference.type === MESSAGE_REFERENCE_TYPE_FORWARD;
}

// Before 14.16, discord.js dropped the reference type and the snapshots, so a
// forward looked exactly like a reply. The message flags are kept raw by every
// 14.x and still tell the two apart.
function isForwardMessage(message) {
    if (!message) return false;
    if (isForwardReference(message.reference)) return true;
    const flags = typeof message.flags === 'number' ? message.flags : message.flags?.bitfield;
    return typeof flags === 'number' && (flags & MESSAGE_FLAG_HAS_SNAPSHOT) !== 0;
}

// True for anything discord.js built, as opposed to plain objects a caller passed
// in. Every structure carries its client; the second check also holds when a
// second copy of discord.js is installed and `instanceof` fails.
function isLibraryStructure(value) {
    return value instanceof discord_js_1.Base || (value !== null && typeof value === 'object' && 'client' in value);
}

const DEFAULT_TIMESTAMP_FORMAT = { dateFormat: 'dd/mm/yyyy', timeFormat: '24h' };

function pad2(n) {
    return n < 10 ? '0' + n : String(n);
}

// Normalizes the user-facing options once, at render start, so every renderer
// shares one reference "now" — otherwise a transcript rendered across midnight
// could label the same day both "today" and with a full date.
// Accepts the documented values case-insensitively ('12H', 'MM/DD/YYYY'); anything
// else falls back to the default and is reported once per value instead of silently.
const warnedChoices = new Set();
function resolveChoice(name, value, allowed, fallback) {
    if (value === undefined || value === null) return fallback;
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
    if (allowed.includes(normalized)) return normalized;
    const key = name + ':' + String(value);
    if (!warnedChoices.has(key)) {
        warnedChoices.add(key);
        console.warn(`[discord-html-transcripts-fix] ${name} must be one of ${allowed.map((a) => `'${a}'`).join(', ')} ` +
            `(got ${typeof value === 'string' ? JSON.stringify(value) : String(value)}); using '${fallback}'.`);
    }
    return fallback;
}

function resolveTimestampFormat(options) {
    const o = options || {};
    return {
        dateFormat: resolveChoice('dateFormat', o.dateFormat, ['dd/mm/yyyy', 'mm/dd/yyyy'], DEFAULT_TIMESTAMP_FORMAT.dateFormat),
        timeFormat: resolveChoice('timeFormat', o.timeFormat, ['24h', '12h'], DEFAULT_TIMESTAMP_FORMAT.timeFormat),
        now: o.now instanceof Date ? o.now : new Date(),
    };
}

function formatClock(d, timeFormat) {
    const minutes = pad2(d.getMinutes());
    if (timeFormat === '12h') {
        const h = d.getHours();
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        return `${pad2(hour12)}:${minutes} ${h < 12 ? 'AM' : 'PM'}`;
    }
    return `${pad2(d.getHours())}:${minutes}`;
}

function formatCalendarDate(d, dateFormat) {
    const day = pad2(d.getDate());
    const month = pad2(d.getMonth() + 1);
    return dateFormat === 'mm/dd/yyyy'
        ? `${month}/${day}/${d.getFullYear()}`
        : `${day}/${month}/${d.getFullYear()}`;
}

function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Mirrors how Discord labels message timestamps: today shows the bare time,
// yesterday is spelled out, anything older gets the full date. The reference
// point is transcript creation time, so an archived transcript keeps saying the
// same thing no matter when it is opened.
// Returns undefined for unusable input so callers can omit the attribute
// entirely rather than render an empty timestamp.
function formatMessageTimestamp(value, format, yesterdayTemplate) {
    const d = value instanceof Date ? value : (typeof value === 'string' || typeof value === 'number' ? new Date(value) : null);
    if (!d || !Number.isFinite(d.getTime())) return undefined;

    const fmt = format && format.now instanceof Date ? format : resolveTimestampFormat(format);
    const time = formatClock(d, fmt.timeFormat);
    const dayDiff = Math.round((startOfDay(fmt.now) - startOfDay(d)) / 86400000);

    if (dayDiff === 0) return time;
    if (dayDiff === 1) return (yesterdayTemplate || 'Yesterday at {time}').replace('{time}', time);
    return `${formatCalendarDate(d, fmt.dateFormat)} ${time}`;
}

function isDefined(value) {
    return value !== undefined && value !== null;
}

function formatBytes(bytes, decimals = 2) {
    if (!bytes || !Number.isFinite(bytes)) return [0, 'Bytes'];
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(bytes) / Math.log(k))));
    return [parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), sizes[i]];
}

const emojiCache = new Map();
function parseDiscordEmoji(emoji) {
    if (!emoji) return '';
    const key = emoji.id || emoji.name;
    if (!key) return '';
    if (emojiCache.has(key)) return emojiCache.get(key);
    let url = '';
    if (emoji.id) {
        url = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
    } else if (typeof emoji.name === 'string' && emoji.name) {
        try {
            const codepoints = twemoji_1.default.convert
                .toCodePoint(emoji.name.indexOf(String.fromCharCode(0x200d)) < 0 ? emoji.name.replace(/️/g, '') : emoji.name)
                .toLowerCase();
            url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoints}.svg`;
        } catch (_e) {
            url = '';
        }
    }
    emojiCache.set(key, url);
    return url;
}

function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

/**
 * JSON.stringify safe to embed in <script>. Escapes <, >, &, U+2028, U+2029.
 */
function safeJsonForScript(obj) {
    return JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

function safeHref(url) {
    if (typeof url !== 'string' || !url) return '#';
    try {
        const u = new URL(url, 'https://example.invalid');
        const proto = u.protocol.toLowerCase();
        if (proto === 'http:' || proto === 'https:' || proto === 'mailto:') return url;
        return '#';
    } catch (_e) {
        return '#';
    }
}

// For URLs that end up as an image source or a file link inside a component, which
// renders them unchecked: web URLs, inline images, and Discord's attachment://
// references. Anything else — javascript:, other data: — becomes undefined.
function safeImageSrc(url) {
    if (typeof url !== 'string' || !url) return undefined;
    const trimmed = url.trim();
    if (/^data:image\//i.test(trimmed) || /^attachment:\/\//i.test(trimmed)) return url;
    try {
        const proto = new URL(trimmed, 'https://example.invalid').protocol.toLowerCase();
        return proto === 'http:' || proto === 'https:' ? url : undefined;
    } catch (_e) {
        return undefined;
    }
}

function safeColor(c, fallback = '#5865F2') {
    if (typeof c !== 'string') return fallback;
    return /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback;
}

const ALLOWED_IMAGE_MIME = new Set([
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml',
]);
function safeImageMime(mime, fallback = 'image/png') {
    if (typeof mime !== 'string') return fallback;
    const m = mime.split(';')[0].trim().toLowerCase();
    return ALLOWED_IMAGE_MIME.has(m) ? m : fallback;
}

function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
//# sourceMappingURL=utils.js.map

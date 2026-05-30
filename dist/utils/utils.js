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
exports.safeColor = safeColor;
exports.safeImageMime = safeImageMime;
exports.escapeHtml = escapeHtml;
const twemoji_1 = __importDefault(require("twemoji"));

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

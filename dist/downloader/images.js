"use strict";
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o){ownKeys = Object.getOwnPropertyNames || function (o){var ar=[];for (var k in o) if (Object.prototype.hasOwnProperty.call(o,k)) ar[ar.length]=k;return ar;};return ownKeys(o);};
    return function (mod){if (mod && mod.__esModule) return mod;var result={};if (mod != null) for (var k=ownKeys(mod), i=0; i<k.length; i++) if (k[i] !== "default") Object.defineProperty(result,k[i],{get:function(){return mod[k[i]];}});Object.defineProperty(result,"default",{value:mod,enumerable:true});return result;};
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptImageDownloader = void 0;
const undici_1 = require("undici");
const debug_1 = __importDefault(require("debug"));
const utils_1 = require("../utils/utils");

// Small inline concurrency limiter — no extra dep
function createLimiter(max) {
    let active = 0;
    const queue = [];
    const next = () => {
        if (active >= max || queue.length === 0) return;
        active++;
        const { fn, resolve, reject } = queue.shift();
        fn().then((v) => { active--; resolve(v); next(); }, (e) => { active--; reject(e); next(); });
    };
    return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

class TranscriptImageDownloader {
    constructor() {
        this.log = TranscriptImageDownloader.log;
        this.maxConcurrent = 6;
        this._sharpModule = null;
        this._limit = null;
    }
    withMaxSize(size) {
        this.maxFileSize = size;
        return this;
    }
    withConcurrency(n) {
        this.maxConcurrent = Math.max(1, Number(n) || 1);
        return this;
    }
    withCompression(quality = 80, convertToWebP = false, options = {}) {
        if (quality < 1 || quality > 100) throw new Error('Quality must be between 1 and 100');
        // Hoist the sharp import so we don't pay it per image
        Promise.resolve()
            .then(() => __importStar(require('sharp')))
            .then((s) => { this._sharpModule = s; })
            .catch((err) => {
                this.log('sharp import failed: %s', err && err.message ? err.message : err);
            });
        this.compression = { quality, convertToWebP, options };
        return this;
    }
    build() {
        if (!this._limit) this._limit = createLimiter(this.maxConcurrent);
        return async (attachment) => {
            if (!attachment.width || !attachment.height) return undefined;
            if (this.maxFileSize && attachment.size > this.maxFileSize * 1024) return undefined;
            return this._limit(() => this._fetchOne(attachment));
        };
    }
    async _fetchOne(attachment) {
        this.log('fetch %s %s', attachment.id, attachment.url);
        const response = await (0, undici_1.request)(attachment.url).catch((err) => {
            this.log('download failed for %s: %s', attachment.id, err && err.message ? err.message : err);
            return null;
        });
        if (!response) return undefined;
        // SECURITY: only accept success responses — avoid embedding HTML/error bodies as images.
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.log('non-2xx status for %s: %d', attachment.id, response.statusCode);
            try { await response.body.arrayBuffer(); } catch (_e) {}
            return undefined;
        }
        const rawMime = response.headers['content-type'];
        const mime = (0, utils_1.safeImageMime)(typeof rawMime === 'string' ? rawMime : '', 'image/png');
        const arr = await response.body.arrayBuffer();
        const buffer = Buffer.from(arr);
        // SECURITY: enforce post-download size against the configured cap (metadata-only check is insufficient).
        if (this.maxFileSize && buffer.length > this.maxFileSize * 1024) {
            this.log('payload exceeded cap for %s (%d > %d)', attachment.id, buffer.length, this.maxFileSize * 1024);
            return undefined;
        }
        this.log('fetched %s (%d bytes, mime=%s)', attachment.id, buffer.length, mime);
        if (this.compression) {
            const sharp = this._sharpModule || (this._sharpModule = await __importStar(require('sharp')));
            this.log('compressing %s with sharp', attachment.id);
            const sharpbuf = await sharp
                .default(buffer)
                .webp(Object.assign({ quality: this.compression.quality, force: this.compression.convertToWebP, effort: 2 }, this.compression.options))
                .toBuffer({ resolveWithObject: true });
            return `data:image/${sharpbuf.info.format};base64,${sharpbuf.data.toString('base64')}`;
        }
        return `data:${mime};base64,${buffer.toString('base64')}`;
    }
}
exports.TranscriptImageDownloader = TranscriptImageDownloader;
TranscriptImageDownloader.log = (0, debug_1.default)('discord-html-transcripts:TranscriptImageDownloader');
//# sourceMappingURL=images.js.map

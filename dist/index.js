"use strict";
/// <reference path="./discord-components.d.ts" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        Object.defineProperty(exports, p, { enumerable: true, get: function() { return m[p]; } });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptImageDownloader = exports.DiscordMessages = void 0;
exports.generateFromMessages = generateFromMessages;
exports.createTranscript = createTranscript;
const debug_1 = __importDefault(require("debug"));
const discord_js_1 = require("discord.js");
const generator_1 = __importDefault(require("./generator"));
const types_1 = require("./types");
const images_1 = require("./downloader/images");

const log = (0, debug_1.default)('discord-html-transcripts-fix');

var transcript_1 = require("./generator/transcript");
Object.defineProperty(exports, "DiscordMessages", { enumerable: true, get: function () { return __importDefault(transcript_1).default; } });
var images_2 = require("./downloader/images");
Object.defineProperty(exports, "TranscriptImageDownloader", { enumerable: true, get: function () { return images_2.TranscriptImageDownloader; } });

// Version check — warn only. NEVER kill host process.
const versionPrefix = discord_js_1.version.split('.')[0];
if (versionPrefix !== '14' && versionPrefix !== '15') {
    console.warn(`[discord-html-transcripts-fix] Compatible with discord.js v14/v15, you are using v${discord_js_1.version}. Continuing anyway.`);
}

async function generateFromMessages(messages, channel, options = {}) {
    const transformedMessages = messages instanceof discord_js_1.Collection ? Array.from(messages.values()) : messages;

    // Image-src resolution
    let resolveImageSrc = options.callbacks?.resolveImageSrc ?? ((attachment) => attachment.url);
    if (options.saveImages) {
        if (options.callbacks?.resolveImageSrc) {
            log('saveImages + resolveImageSrc both set — resolveImageSrc wins');
        } else {
            resolveImageSrc = new images_1.TranscriptImageDownloader().build();
            log('using default image downloader');
        }
    }

    // Pre-build resolution maps from messages so mentions resolve to a name even
    // when the user/role/channel isn't in client cache and can't be fetched.
    const userIndex = new Map();
    const roleIndex = new Map();
    const channelIndex = new Map();
    for (const m of transformedMessages) {
        if (m.author) userIndex.set(m.author.id, m.author);
        if (m.member?.user) userIndex.set(m.member.user.id, m.member.user);
        if (m.interaction?.user) userIndex.set(m.interaction.user.id, m.interaction.user);
        if (m.mentions) {
            if (m.mentions.users) for (const [id, u] of m.mentions.users) userIndex.set(id, u);
            if (m.mentions.roles) for (const [id, r] of m.mentions.roles) roleIndex.set(id, r);
            if (m.mentions.channels) for (const [id, c] of m.mentions.channels) channelIndex.set(id, c);
        }
    }
    if (!channel.isDMBased() && channel.guild) {
        // pre-warm every role we can see (cheap — cache only)
        for (const [id, r] of channel.guild.roles.cache) roleIndex.set(id, r);
    }

    const callbacks = Object.assign({
        resolveImageSrc,
        resolveChannel: async (id) => channelIndex.get(id) || channel.client.channels.fetch(id).catch(() => null),
        resolveUser: async (id) => userIndex.get(id) || channel.client.users.fetch(id).catch(() => null),
        resolveRole: channel.isDMBased()
            ? () => null
            : async (id) => roleIndex.get(id) || channel.guild?.roles.fetch(id).catch(() => null),
    }, options.callbacks ?? {});

    const rendered = await (0, generator_1.default)({
        messages: transformedMessages,
        channel,
        saveImages: options.saveImages ?? false,
        callbacks,
        poweredBy: options.poweredBy ?? false,
        footerText: options.footerText ?? 'Exported {number} message{s}.',
        statsFooter: options.statsFooter,
        favicon: options.favicon ?? 'guild',
        hydrate: options.hydrate ?? false,
        language: options.language ?? 'en',
        i18n: options.i18n ?? undefined,
        stream: options.returnType === 'stream' || options.stream === true,
        returnType: options.returnType,
    });

    // Stream pass-through
    if (options.returnType === 'stream' || options.stream === true) {
        return rendered; // Node readable stream
    }

    if (options.returnType === types_1.ExportReturnType.Buffer) {
        return Buffer.from(rendered);
    }
    if (options.returnType === types_1.ExportReturnType.String) {
        return rendered;
    }
    return new discord_js_1.AttachmentBuilder(Buffer.from(rendered), {
        name: options.filename ?? `transcript-${channel.id}.html`,
    });
}

async function createTranscript(channel, options = {}) {
    if (!channel.isTextBased()) {
        throw new TypeError(`Provided channel must be text-based, received ${channel.type}`);
    }
    let allMessages = [];
    let lastMessageId;
    const { limit, filter } = options;
    const resolvedLimit = typeof limit === 'undefined' || limit === -1 ? Infinity : limit;
    while (true) {
        const fetchLimitOptions = { limit: 100, before: lastMessageId };
        if (!lastMessageId) delete fetchLimitOptions.before;
        const messages = await channel.messages.fetch(fetchLimitOptions);
        const filteredMessages = typeof filter === 'function' ? messages.filter(filter) : messages;
        for (const m of filteredMessages.values()) allMessages.push(m);
        lastMessageId = messages.lastKey();
        if (messages.size < 100) break;
        if (allMessages.length >= resolvedLimit) break;
    }
    if (resolvedLimit < allMessages.length) {
        allMessages = allMessages.slice(0, resolvedLimit);
    }
    return generateFromMessages(allMessages.reverse(), channel, options);
}

exports.default = { createTranscript, generateFromMessages };
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map

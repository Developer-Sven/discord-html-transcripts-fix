"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o){ownKeys = Object.getOwnPropertyNames || function (o){var ar=[];for (var k in o) if (Object.prototype.hasOwnProperty.call(o,k)) ar[ar.length]=k;return ar;};return ownKeys(o);};
    return function (mod){if (mod && mod.__esModule) return mod;var result={};if (mod != null) for (var k=ownKeys(mod), i=0; i<k.length; i++) if (k[i] !== "default") Object.defineProperty(result,k[i],{get:function(){return mod[k[i]];}});Object.defineProperty(result,"default",{value:mod,enumerable:true});return result;};
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiscordMessages;
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_js_1 = require("discord.js");
const content_1 = __importStar(require("./renderers/content"));
const message_1 = __importDefault(require("./renderers/message"));
const TranscriptHeader_1 = require("./renderers/components/TranscriptHeader");

async function DiscordMessages(_a) {
    var { messages, channel, callbacks } = _a, options = __rest(_a, ["messages", "channel", "callbacks"]);
    const dateSeps = options.dateSeps || [];

    return ((0, jsx_runtime_1.jsxs)("discord-messages", { style: { minHeight: '100vh' }, children: [
        (0, jsx_runtime_1.jsx)(TranscriptHeader_1.TranscriptHeader, {
            guildName: channel.isDMBased() ? 'Direct Messages' : channel.guild.name,
            guildIcon: channel.isDMBased() ? undefined : (channel.guild.iconURL({ size: 128 }) ?? undefined),
            channelName: channel.isDMBased()
                ? channel.type === discord_js_1.ChannelType.DM
                    ? (channel.recipient?.tag ?? 'Unknown Recipient')
                    : 'Unknown Recipient'
                : channel.name,
            children: channel.isThread() ? (`Thread channel in ${channel.parent?.name ?? 'Unknown Channel'}`)
                : channel.isDMBased() ? (`Direct Messages`)
                : channel.isVoiceBased() ? (`Voice Text Channel for ${channel.name}`)
                : channel.type === discord_js_1.ChannelType.GuildCategory ? (`Category Channel`)
                : 'topic' in channel && channel.topic
                    ? (0, jsx_runtime_1.jsx)(content_1.default, { content: channel.topic, context: Object.assign({ messages, channel, callbacks, type: content_1.RenderType.REPLY }, options) })
                    : (`This is the start of #${channel.name} channel.`)
        }),
        messages.map((message, idx) => [
            dateSeps[idx] && (0, jsx_runtime_1.jsx)("div", { className: "dht-date-sep", children: dateSeps[idx] }, `sep-${idx}`),
            (0, jsx_runtime_1.jsx)(message_1.default, { message: message, context: Object.assign({ messages, channel, callbacks }, options) }, message.id)
        ]),
        renderLegacyFooter(messages, options),
    ] }));
}

// Legacy "Exported X message(s). Powered by …" footer line.
//
// The new stats footer (see renderStatsFooter in generator/index.js) already
// shows the message count and more. To prevent two footers stacking on the
// same transcript, the legacy footer is now mutually exclusive with the
// stats footer: it ONLY renders when the caller has explicitly disabled the
// stats footer via `statsFooter: false` (or `{ enabled: false }`). Setting
// `footerText` or `poweredBy` alone is no longer enough — that used to
// produce a duplicate footer because the stats footer kept rendering.
function renderLegacyFooter(messages, options) {
    const statsDisabled = options.statsFooter === false ||
        (options.statsFooter && options.statsFooter.enabled === false);
    if (!statsDisabled) return null;
    const customText = (typeof options.footerText === 'string' && options.footerText.length > 0)
        ? options.footerText.replaceAll('{number}', messages.length.toString()).replaceAll('{s}', messages.length > 1 ? 's' : '')
        : null;
    const wantsPowered = !!options.poweredBy;
    const defaultText = !customText
        ? `Exported ${messages.length} message${messages.length > 1 ? 's' : ''}.`
        : null;
    const shown = customText || defaultText;
    if (!shown && !wantsPowered) return null;
    return (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center', width: '100%' }, children: [
        shown,
        shown && wantsPowered ? ' ' : null,
        wantsPowered
            ? (0, jsx_runtime_1.jsxs)("span", { style: { textAlign: 'center' }, children: ["Powered by ", (0, jsx_runtime_1.jsx)("a", { href: "https://github.com/ItzDerock/discord-html-transcripts", style: { color: 'lightblue' }, children: "discord-html-transcripts" }), "."] })
            : null
    ] });
}
//# sourceMappingURL=transcript.js.map

"use strict";
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o){ownKeys = Object.getOwnPropertyNames || function (o){var ar=[];for (var k in o) if (Object.prototype.hasOwnProperty.call(o,k)) ar[ar.length]=k;return ar;};return ownKeys(o);};
    return function (mod){if (mod && mod.__esModule) return mod;var result={};if (mod != null) for (var k=ownKeys(mod), i=0; i<k.length; i++) if (k[i] !== "default") Object.defineProperty(result,k[i],{get:function(){return mod[k[i]];}});Object.defineProperty(result,"default",{value:mod,enumerable:true});return result;};
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MessageReply;
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_js_1 = require("discord.js");
const content_1 = __importStar(require("./content"));

function t(context, key, fallback) {
    const dict = context?.i18n?.[context?.lang] || context?.i18n?.en || {};
    return dict[key] || fallback || key;
}

async function MessageReply({ message, context }) {
    if (!message.reference) return null;

    const isCrossGuild = message.reference.guildId !== message.guild?.id;

    // Cross-guild reply: show a placeholder pill instead of silently dropping.
    if (isCrossGuild) {
        return (0, jsx_runtime_1.jsx)("discord-reply", {
            slot: "reply",
            server: true,
            children: (0, jsx_runtime_1.jsx)("em", { "data-i18n": "crossServerReply", children: t(context, 'crossServerReply', 'Message from another server') })
        });
    }

    const referencedMessage = context.messages.find((m) => m.id === message.reference.messageId);
    if (!referencedMessage)
        return (0, jsx_runtime_1.jsx)("discord-reply", { slot: "reply", children: "Message could not be loaded." });

    const isCrossPost = referencedMessage.reference && referencedMessage.reference.guildId !== message.guild?.id;
    const isCommand = !!referencedMessage.interaction;
    // Special-case: replying to a forwarded-only / Components-V2-only message has empty content
    const hasContent = !!referencedMessage.content;
    const hasSnapshot = Array.isArray(referencedMessage.messageSnapshots) && referencedMessage.messageSnapshots.length > 0;
    const hasComponents = Array.isArray(referencedMessage.components) && referencedMessage.components.length > 0;
    const hasSticker = referencedMessage.stickers?.size > 0;
    const author = referencedMessage.member?.nickname ?? referencedMessage.author.displayName ?? referencedMessage.author.username;
    const avatar = referencedMessage.author.avatarURL?.({ size: 32 }) ?? undefined;
    const roleColor = referencedMessage.member?.displayHexColor ?? undefined;
    const op = referencedMessage.author.id === message?.channel?.ownerId && message?.channel?.isThread?.();

    return ((0, jsx_runtime_1.jsx)("discord-reply", {
        slot: "reply",
        edited: !isCommand && referencedMessage.editedAt !== null,
        attachment: referencedMessage.attachments.size > 0,
        author: author,
        avatar: avatar,
        roleColor: roleColor,
        bot: !isCrossPost && referencedMessage.author.bot,
        verified: referencedMessage.author.flags?.has?.(discord_js_1.UserFlags.VerifiedBot),
        op: op,
        server: isCrossPost ?? undefined,
        command: isCommand,
        children: hasContent
            ? (0, jsx_runtime_1.jsx)("span", { "data-goto": referencedMessage.id, className: "reply-inline", children: (0, jsx_runtime_1.jsx)(content_1.default, { content: referencedMessage.content, context: Object.assign({}, context, { type: content_1.RenderType.REPLY }) }) })
            : isCommand
                ? (0, jsx_runtime_1.jsx)("em", { "data-goto": referencedMessage.id, children: "Click to see command." })
                : hasSnapshot
                    ? (0, jsx_runtime_1.jsx)("em", { "data-goto": referencedMessage.id, children: "Click to see forwarded message." })
                    : hasComponents
                        ? (0, jsx_runtime_1.jsx)("em", { "data-goto": referencedMessage.id, children: "Click to see message." })
                        : hasSticker
                            ? (0, jsx_runtime_1.jsx)("em", { "data-goto": referencedMessage.id, children: "Click to see sticker." })
                            : (0, jsx_runtime_1.jsx)("em", { "data-goto": referencedMessage.id, children: "Click to see attachment." })
    }));
}
//# sourceMappingURL=reply.js.map

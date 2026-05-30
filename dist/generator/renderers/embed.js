"use strict";
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o){ownKeys = Object.getOwnPropertyNames || function (o){var ar=[];for (var k in o) if (Object.prototype.hasOwnProperty.call(o,k)) ar[ar.length]=k;return ar;};return ownKeys(o);};
    return function (mod){if (mod && mod.__esModule) return mod;var result={};if (mod != null) for (var k=ownKeys(mod), i=0; i<k.length; i++) if (k[i] !== "default") Object.defineProperty(result,k[i],{get:function(){return mod[k[i]];}});Object.defineProperty(result,"default",{value:mod,enumerable:true});return result;};
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordEmbed = DiscordEmbed;
const jsx_runtime_1 = require("react/jsx-runtime");
const embeds_1 = require("../../utils/embeds");
const content_1 = __importStar(require("./content"));
const utils_1 = require("../../utils/utils");

async function DiscordEmbed({ embed, context }) {
    const type = embed.type || 'rich';
    const url = embed.url ? (0, utils_1.safeHref)(embed.url) : undefined;
    const imageUrl = embed.image?.proxyURL ?? embed.image?.url;
    const videoUrl = embed.video?.proxyURL ?? embed.video?.url;
    const provider = embed.provider?.name;
    const safeVid = videoUrl ? (0, utils_1.safeHref)(videoUrl) : null;
    const safeImg = imageUrl ? (0, utils_1.safeHref)(imageUrl) : null;

    // Image-only embeds (link previews): render the image alone with optional caption
    if (type === 'image' && safeImg) {
        return (0, jsx_runtime_1.jsx)("div", { className: "dht-embed dht-embed--image", children: (0, jsx_runtime_1.jsx)("a", { href: url || safeImg, target: "_blank", rel: "noreferrer", children: (0, jsx_runtime_1.jsx)("img", { src: safeImg, alt: embed.title || '', className: "dht-embed-image", loading: "lazy" }) }) });
    }
    // GIFV — auto-play loop video
    if (type === 'gifv' && safeVid) {
        return (0, jsx_runtime_1.jsx)("div", { className: "dht-embed dht-embed--gifv", children: (0, jsx_runtime_1.jsx)("video", { src: safeVid, autoPlay: true, loop: true, muted: true, playsInline: true, className: "dht-embed-gifv", "aria-label": embed.title || 'GIF' }) });
    }
    // Video embed (YouTube/Vimeo/etc.) — show thumbnail with a play overlay linking to original
    if (type === 'video' && (safeVid || safeImg)) {
        return (0, jsx_runtime_1.jsxs)("div", { className: "dht-embed dht-embed--video", children: [
            (0, jsx_runtime_1.jsxs)("a", { href: url || safeVid || safeImg, target: "_blank", rel: "noreferrer", className: "dht-embed-video-wrap", children: [
                safeImg && (0, jsx_runtime_1.jsx)("img", { src: safeImg, alt: embed.title || '', className: "dht-embed-video-thumb", loading: "lazy" }),
                (0, jsx_runtime_1.jsx)("div", { className: "dht-embed-video-play", children: '▶' })
            ] }),
            provider && (0, jsx_runtime_1.jsx)("div", { className: "dht-embed-provider", children: provider }),
            embed.title && (0, jsx_runtime_1.jsx)("a", { href: url || safeVid, target: "_blank", rel: "noreferrer", className: "dht-embed-title", children: embed.title }),
        ] });
    }

    // Default rich embed
    const title = embed.title ?? undefined;
    const authorImage = embed.author?.proxyIconURL ?? embed.author?.iconURL;
    const authorName = embed.author?.name;
    const authorUrl = embed.author?.url ? (0, utils_1.safeHref)(embed.author.url) : undefined;
    const color = embed.hexColor ? (0, utils_1.safeColor)(embed.hexColor, undefined) : undefined;
    const thumb = embed.thumbnail?.proxyURL ?? embed.thumbnail?.url;

    return ((0, jsx_runtime_1.jsxs)("discord-embed", {
        "embed-title": title,
        slot: "embeds",
        "author-image": authorImage,
        "author-name": authorName,
        "author-url": authorUrl,
        color: color,
        image: safeImg,
        thumbnail: thumb,
        url: url,
        children: [
            provider && ((0, jsx_runtime_1.jsx)("div", { className: "dht-embed-provider", slot: "author", children: provider })),
            embed.description && ((0, jsx_runtime_1.jsx)("discord-embed-description", {
                slot: "description",
                children: (0, jsx_runtime_1.jsx)(content_1.default, { content: embed.description, context: Object.assign({}, context, { type: content_1.RenderType.EMBED }) })
            })),
            embed.fields.length > 0 && ((0, jsx_runtime_1.jsx)("discord-embed-fields", {
                slot: "fields",
                children: embed.fields.map((field, id) => ((0, jsx_runtime_1.jsx)(EmbedField, { embed, field, id, context }, `${context.message.id}-e-${context.index}-f-${id}`)))
            })),
            safeVid && ((0, jsx_runtime_1.jsx)("div", { className: "dht-embed-video", children: (0, jsx_runtime_1.jsxs)("a", { href: safeVid, target: "_blank", rel: "noreferrer", children: ['▶ Open video', provider ? ` (${provider})` : ''] }) })),
            embed.footer && ((0, jsx_runtime_1.jsx)("discord-embed-footer", {
                slot: "footer",
                footerImage: embed.footer.proxyIconURL ?? embed.footer.iconURL,
                timestamp: embed.timestamp ?? undefined,
                children: embed.footer.text
            }))
        ]
    }, `${context.message.id}-e-${context.index}`));
}

async function EmbedField({ embed, field, id, context }) {
    return (0, jsx_runtime_1.jsx)("discord-embed-field", {
        "field-title": field.name,
        inline: !!field.inline,
        "inline-index": field.inline ? (0, embeds_1.calculateInlineIndex)(embed.fields, id) : undefined,
        children: (0, jsx_runtime_1.jsx)(content_1.default, { content: field.value, context: Object.assign({}, context, { type: content_1.RenderType.EMBED }) })
    });
}
//# sourceMappingURL=embed.js.map

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attachments = Attachments;
exports.Attachment = Attachment;
const jsx_runtime_1 = require("react/jsx-runtime");
const types_1 = require("../../types");
const utils_1 = require("../../utils/utils");
const DiscordImage_1 = require("./components/DiscordImage");

async function Attachments(props) {
    if (props.message.attachments.size === 0) return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
    return props.message.attachments.map((attachment, id) => ((0, jsx_runtime_1.jsx)(Attachment, { attachment: attachment, message: props.message, context: props.context }, id)));
}

async function Attachment({ attachment, context, message }) {
    let url = (0, utils_1.safeHref)(attachment.url) === '#' ? '#' : attachment.url;
    const attachmentType = getAttachmentType(attachment);
    const [bytes, bytesUnit] = (0, utils_1.formatBytes)(attachment.size);
    const altText = attachment.description || attachment.name;

    // GIFV detection: animated content served as video but spec-typed as GIF
    const isGifv = attachment.contentType === 'video/mp4' && /\.(gifv?|webm)$/i.test(attachment.name || '');

    switch (attachmentType) {
        case types_1.AttachmentTypes.Image: {
            const downloaded = await context.callbacks.resolveImageSrc(attachment.toJSON(), message.toJSON());
            if (downloaded !== null) {
                url = downloaded ?? url;
            }
            // GIF / animated content — Discord auto-plays. Render as <video> when needed.
            if (attachment.contentType === 'image/gif' || isGifv) {
                return (0, jsx_runtime_1.jsx)("video", { src: url, autoPlay: true, loop: true, muted: true, playsInline: true, className: "dht-gifv", "aria-label": altText }, attachment.id);
            }
            return (0, jsx_runtime_1.jsx)(DiscordImage_1.DiscordImageAttachment, { url: url, alt: altText, title: attachment.description || undefined }, attachment.id);
        }
        case types_1.AttachmentTypes.Video: {
            return (0, jsx_runtime_1.jsx)("discord-video-attachment", { slot: "attachments", href: url }, attachment.id);
        }
        case types_1.AttachmentTypes.Audio: {
            // Voice messages have waveform + duration_secs — message.js renders the indicator
            return (0, jsx_runtime_1.jsx)("discord-audio-attachment", { slot: "attachments", href: url, bytes: bytes, bytesUnit: bytesUnit, name: attachment.name, title: attachment.description || undefined }, attachment.id);
        }
        case types_1.AttachmentTypes.File: {
            return (0, jsx_runtime_1.jsx)("discord-file-attachment", { slot: "attachments", href: url, bytes: bytes, "bytes-unit": bytesUnit, name: attachment.name, title: attachment.description || undefined }, attachment.id);
        }
    }
}

function getAttachmentType(attachment) {
    const top = attachment.contentType?.split('/')?.[0];
    switch (top) {
        case 'audio': return types_1.AttachmentTypes.Audio;
        case 'image': return types_1.AttachmentTypes.Image;
        case 'video': return types_1.AttachmentTypes.Video;
        default: return types_1.AttachmentTypes.File;
    }
}
//# sourceMappingURL=attachment.js.map

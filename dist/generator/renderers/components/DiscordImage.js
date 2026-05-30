"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordAttachmentStyles = void 0;
exports.DiscordImageAttachment = DiscordImageAttachment;
const jsx_runtime_1 = require("react/jsx-runtime");
exports.DiscordAttachmentStyles = `
  .discord-attachment-container {
    display: block;
    position: relative;
    max-width: min(100%, 525px);
  }

  .discord-attachment-container > img {
    max-width: 100%;
    border-radius: 8px;
  }
`;
function DiscordImageAttachment(props) {
    return ((0, jsx_runtime_1.jsx)("div", { slot: "attachments", className: "discord-attachment-container", children: (0, jsx_runtime_1.jsx)("img", { src: props.url, alt: props.alt }) }));
}
//# sourceMappingURL=DiscordImage.js.map
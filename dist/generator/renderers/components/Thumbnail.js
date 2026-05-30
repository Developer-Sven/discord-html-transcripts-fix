"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
function DiscordThumbnail({ url }) {
    return ((0, jsx_runtime_1.jsx)("img", { src: url, alt: "Thumbnail", style: {
            width: '85px',
            height: '85px',
            objectFit: 'cover',
            borderRadius: '8px',
        } }));
}
exports.default = DiscordThumbnail;
//# sourceMappingURL=Thumbnail.js.map
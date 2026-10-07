"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("./utils");
const utils_2 = require("../../../utils/utils");
function DiscordMediaGallery({ component }) {
    if (!component.items || component.items.length === 0) {
        return null;
    }
    const count = component.items.length;
    const imagesToShow = component.items.slice(0, 10);
    const hasMore = component.items.length > 10;
    return ((0, jsx_runtime_1.jsx)("div", { style: (0, utils_1.getGalleryLayout)(count), children: imagesToShow.map((media, idx) => {
        const url = (0, utils_2.safeImageSrc)(media.media?.url);
        const isVideo = typeof url === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(url);
        const img = isVideo
            ? (0, jsx_runtime_1.jsx)("video", { src: url, autoPlay: true, loop: true, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover' } })
            : (0, jsx_runtime_1.jsx)("img", { src: url, alt: media.description || 'Media content', loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'cover' } });
        const wrapped = media.spoiler
            ? (0, jsx_runtime_1.jsx)("span", { className: "discord-spoiler", style: { display: 'block', width: '100%', height: '100%' }, children: img })
            : img;
        return ((0, jsx_runtime_1.jsxs)("div", { style: (0, utils_1.getImageStyle)(idx, count), children: [wrapped, hasMore && idx === imagesToShow.length - 1 && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold',
                }, children: ["+", component.items.length - 10] }))] }, idx));
    }) }));
}
exports.default = DiscordMediaGallery;
//# sourceMappingURL=Media%20Gallery.js.map
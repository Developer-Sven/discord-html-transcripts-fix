"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordButton = DiscordButton;
const jsx_runtime_1 = require("react/jsx-runtime");
function DiscordButton({ type, url, emoji, children }) {
    return ((0, jsx_runtime_1.jsxs)("a", { href: url, target: "_blank", className: `discord-button discord-button-${type}`, children: [emoji && ((0, jsx_runtime_1.jsx)("span", { style: { display: 'flex', alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)("img", { src: emoji, alt: "emoji", style: { width: '16px', height: '16px', marginRight: '8px' } }) })), (0, jsx_runtime_1.jsx)("span", { style: { display: 'flex', alignItems: 'center' }, children: children }), url && ((0, jsx_runtime_1.jsx)("span", { style: { marginLeft: '8px', display: 'flex', alignItems: 'center' }, children: (0, jsx_runtime_1.jsxs)("svg", { role: "img", xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", fill: "none", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M15 2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V4.41l-4.3 4.3a1 1 0 1 1-1.4-1.42L19.58 3H16a1 1 0 0 1-1-1Z" }), (0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M5 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-6a1 1 0 1 0-2 0v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6a1 1 0 1 0 0-2H5Z" })] }) }))] }));
}
exports.default = DiscordButton;
//# sourceMappingURL=Button.js.map
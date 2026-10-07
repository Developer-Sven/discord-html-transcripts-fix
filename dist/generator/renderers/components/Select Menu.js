"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_js_1 = require("discord.js");
const utils_1 = require("../../../utils/utils");
const utils_2 = require("./utils");
function DiscordSelectMenu({ component, }) {
    const isStringSelect = component.type === discord_js_1.ComponentType.StringSelect;
    const placeholder = component.placeholder || (0, utils_2.getSelectTypeLabel)(component.type);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "discord-select-menu", children: [(0, jsx_runtime_1.jsx)("div", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: placeholder }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', alignItems: 'center', marginLeft: '8px' }, children: (0, jsx_runtime_1.jsx)("svg", { width: "24", height: "24", viewBox: "0 0 24 24", children: (0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M7 10L12 15L17 10H7Z" }) }) }), isStringSelect && component.options && component.options.length > 0 && ((0, jsx_runtime_1.jsx)("div", { style: {
                    display: 'none',
                    position: 'absolute',
                    top: '44px',
                    left: '0',
                    width: '100%',
                    backgroundColor: '#2b2d31',
                    borderRadius: '4px',
                    zIndex: 10,
                    border: '1px solid #1e1f22',
                    maxHeight: '320px',
                    overflowY: 'auto',
                }, children: component.options.map((option, idx) => {
                    // parseDiscordEmoji returns an image URL — empty when the emoji has
                    // neither id nor name. As plain children it showed up as raw URL text
                    // in the opened menu instead of the emoji.
                    const emojiSrc = option.emoji ? (0, utils_1.parseDiscordEmoji)(option.emoji) : '';
                    return ((0, jsx_runtime_1.jsxs)("div", { style: {
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        borderBottom: idx < component.options.length - 1 ? '1px solid #1e1f22' : 'none',
                    }, children: [emojiSrc && (0, jsx_runtime_1.jsx)("span", { style: { marginRight: '8px', display: 'flex', alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)("img", { src: emojiSrc, alt: option.emoji.name || 'emoji', style: { width: '16px', height: '16px' } }) }), (0, jsx_runtime_1.jsx)("span", { children: option.label })] }, idx));
                }) }))] }));
}
exports.default = DiscordSelectMenu;
//# sourceMappingURL=Select%20Menu.js.map
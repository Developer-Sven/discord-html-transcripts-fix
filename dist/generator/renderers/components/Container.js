"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../../utils/utils");

function colorToHex(color) {
    if (color == null) return null;
    if (typeof color === 'string') {
        return color.startsWith('#') ? color : '#' + color.replace(/^0x/i, '');
    }
    if (typeof color === 'number') {
        return '#' + color.toString(16).padStart(6, '0');
    }
    return null;
}

function DiscordContainer({ children, accentColor, spoiler }) {
    // SECURITY: route accentColor through safeColor so an attacker-controlled
    // string can't smuggle CSS into the inline borderLeft.
    const raw = colorToHex(accentColor);
    const hex = raw ? (0, utils_1.safeColor)(raw, null) : null;
    // FIX: previous layout was display:flex;flex-direction:column;gap:8px which
    // forced every direct child — including inline <strong>, <br>, mention
    // <span> and text nodes — to become its own vertical flex item. That broke
    // sentences across multiple lines and made role mentions fill the entire
    // row. Use normal block flow instead so inline content lays out the way
    // Discord renders it.
    const style = {
        display: 'block',
        width: '100%',
        maxWidth: '500px',
        minWidth: 0,
        backgroundColor: '#3f4248',
        padding: '16px',
        borderLeft: hex ? `4px solid ${hex}` : '1px solid #4f5359',
        borderTop: '1px solid #4f5359',
        borderRight: '1px solid #4f5359',
        borderBottom: '1px solid #4f5359',
        marginTop: '2px',
        marginBottom: '2px',
        borderRadius: '10px',
        boxSizing: 'border-box',
        lineHeight: 1.4,
        color: '#dbdee1',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
    };
    const node = (0, jsx_runtime_1.jsx)("div", { className: "dht-v2-container", style, children });
    if (spoiler) {
        return (0, jsx_runtime_1.jsx)("span", { className: "discord-spoiler", children: node });
    }
    return node;
}
exports.default = DiscordContainer;
//# sourceMappingURL=Container.js.map

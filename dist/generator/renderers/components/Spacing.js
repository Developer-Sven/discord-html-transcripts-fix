"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_js_1 = require("discord.js");

/**
 * V2 Separator component. `spacing` is Small (1) or Large (2). `divider` toggles the visual line.
 * In Discord's UI: Small ≈ 8px, Large ≈ 16px vertical padding. Divider draws a 1px line.
 */
function DiscordSeparator({ divider, spacing }) {
    const isLarge = spacing === discord_js_1.SeparatorSpacingSize?.Large || spacing === 2;
    const pad = isLarge ? 16 : 8;
    const showLine = divider !== false; // default true in Discord — only false when explicitly set
    return (0, jsx_runtime_1.jsx)("div", {
        className: "dht-v2-separator",
        style: {
            width: '100%',
            padding: `${pad}px 0`,
            display: 'flex',
            alignItems: 'center',
        },
        children: showLine ? (0, jsx_runtime_1.jsx)("div", { style: { width: '100%', height: '1px', backgroundColor: 'rgba(79,84,89,0.65)' } }) : null
    });
}
exports.default = DiscordSeparator;
//# sourceMappingURL=Spacing.js.map

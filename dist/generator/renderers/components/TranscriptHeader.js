"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptHeader = TranscriptHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
function TranscriptHeader(props) {
    // If guild has no icon, we take first letter of guild name words
    // i.e. Guild A -> GA
    // and OneWordGuildName -> O
    const split = props.guildName.split(' ');
    const placeholder = split.length > 1 ? split[0][0] + split[1][0] : split[0][0];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "discord-header", children: [(0, jsx_runtime_1.jsx)("div", { className: "discord-header-icon", children: props.guildIcon ? ((0, jsx_runtime_1.jsx)("img", { src: props.guildIcon, alt: "guild icon" })) : ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("span", { children: placeholder }) })) }), (0, jsx_runtime_1.jsxs)("div", { className: "discord-header-text", children: [(0, jsx_runtime_1.jsx)("div", { className: "discord-header-text-guild", children: props.guildName }), (0, jsx_runtime_1.jsxs)("div", { className: "discord-header-text-channel", children: ["#", props.channelName] }), props.children] })] }));
}
//# sourceMappingURL=TranscriptHeader.js.map
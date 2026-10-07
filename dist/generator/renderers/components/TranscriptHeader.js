"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptHeader = TranscriptHeader;
const jsx_runtime_1 = require("react/jsx-runtime");

// The first user-perceived character of a word. word[0] is one UTF-16 code unit —
// half of a character outside the Basic Multilingual Plane (fancy-font letters, emoji),
// which cannot be encoded — and would also cut an accent off its letter or an emoji
// sequence apart.
const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
function firstCharacter(word) {
    if (segmenter) {
        for (const { segment } of segmenter.segment(word)) return segment;
        return '';
    }
    const codePoint = word.codePointAt(0);
    return codePoint === undefined ? '' : String.fromCodePoint(codePoint);
}

function TranscriptHeader(props) {
    // If guild has no icon, we take first letter of guild name words
    // i.e. Guild A -> GA
    // and OneWordGuildName -> O
    if (typeof props.guildName !== 'string') {
        console.warn('[discord-html-transcripts-fix] the server has no name (an unavailable guild?); the header shows none');
    }
    const words = String(props.guildName ?? '').split(/\s+/).filter(Boolean);
    const placeholder = words.length > 1 ? firstCharacter(words[0]) + firstCharacter(words[1]) : firstCharacter(words[0] ?? '');
    return ((0, jsx_runtime_1.jsxs)("div", { className: "discord-header", children: [(0, jsx_runtime_1.jsx)("div", { className: "discord-header-icon", children: props.guildIcon ? ((0, jsx_runtime_1.jsx)("img", { src: props.guildIcon, alt: "guild icon" })) : ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("span", { children: placeholder }) })) }), (0, jsx_runtime_1.jsxs)("div", { className: "discord-header-text", children: [(0, jsx_runtime_1.jsx)("div", { className: "discord-header-text-guild", children: props.guildName }), (0, jsx_runtime_1.jsxs)("div", { className: "discord-header-text-channel", children: ["#", props.channelName] }), props.children] })] }));
}
//# sourceMappingURL=TranscriptHeader.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
function SectionContent({ children }) {
    return ((0, jsx_runtime_1.jsx)("div", {
        className: "dht-section-content",
        style: {
            // Block flow so inline content (mentions, strong, br, text) flows
            // naturally inside the section instead of becoming flex rows.
            display: 'block',
            flex: 1,
            minWidth: 0,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            lineHeight: 1.4,
        },
        children
    }));
}
exports.default = SectionContent;
//# sourceMappingURL=SectionContent.js.map

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
function SectionAccessory({ children }) {
    if (!children) return null;
    return ((0, jsx_runtime_1.jsx)("div", {
        style: {
            display: 'flex',
            flex: '0 0 auto',
            justifyContent: 'flex-end',
            alignItems: 'center',
        },
        children
    }));
}
exports.default = SectionAccessory;
//# sourceMappingURL=SectionAccessory.js.map

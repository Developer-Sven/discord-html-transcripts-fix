"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const components_1 = require("../../components");
const SectionContent_1 = __importDefault(require("./SectionContent"));
const SectionAccessory_1 = __importDefault(require("./SectionAccessory"));
function DiscordSection({ children, accessory, id }) {
    return ((0, jsx_runtime_1.jsxs)("div", {
        style: {
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            maxWidth: '500px',
            minWidth: 0,
            gap: '12px',
            alignItems: 'flex-start',
            boxSizing: 'border-box',
        },
        children: [
            (0, jsx_runtime_1.jsx)(SectionContent_1.default, { children }),
            accessory ? (0, jsx_runtime_1.jsx)(SectionAccessory_1.default, { children: (0, jsx_runtime_1.jsx)(components_1.Component, { component: accessory, id }) }) : null,
        ]
    }));
}
exports.default = DiscordSection;
//# sourceMappingURL=Section.js.map

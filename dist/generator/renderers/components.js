"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComponentRow;
exports.Component = Component;
const jsx_runtime_1 = require("react/jsx-runtime");
const discord_js_1 = require("discord.js");
const utils_1 = require("../../utils/utils");
const Select_Menu_1 = __importDefault(require("./components/Select Menu"));
const Container_1 = __importDefault(require("./components/Container"));
const Section_1 = __importDefault(require("./components/section/Section"));
const Media_Gallery_1 = __importDefault(require("./components/Media Gallery"));
const Spacing_1 = __importDefault(require("./components/Spacing"));
const Button_1 = __importDefault(require("./components/Button"));
const Thumbnail_1 = __importDefault(require("./components/Thumbnail"));
const content_1 = __importDefault(require("./content"));
const content_2 = require("./content");
const styles_1 = require("./components/styles");
function ComponentRow({ component, id, context, }) {
    switch (component.type) {
        case discord_js_1.ComponentType.ActionRow:
            return ((0, jsx_runtime_1.jsx)("discord-action-row", { children: (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: component.components.map((nestedComponent, id) => ((0, jsx_runtime_1.jsx)(Component, { component: nestedComponent, id: id }, id))) }) }, id));
        case discord_js_1.ComponentType.Container: {
            const accentColor = component.accent_color !== undefined
                ? component.accent_color
                : (component.accentColor !== undefined ? component.accentColor : null);
            const spoiler = !!component.spoiler;
            return ((0, jsx_runtime_1.jsx)(Container_1.default, { accentColor: accentColor, spoiler: spoiler, children: (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: component.components.map((nestedComponent, id) => ((0, jsx_runtime_1.jsx)(ComponentRow, { component: nestedComponent, id: id, context: context }, id))) }) }, id));
        }
        case discord_js_1.ComponentType.File: {
            // <discord-file-attachment> turns href into a link without checking it.
            const fileHref = (0, utils_1.safeLinkHref)(component.file?.url);
            // A rejected link gets no href at all: "#" would open the transcript itself.
            const attachmentComponent = (0, jsx_runtime_1.jsx)("discord-file-attachment", { href: fileHref === '#' ? undefined : fileHref });
            if (component.spoiler) {
                return ((0, jsx_runtime_1.jsx)("discord-spoiler", { slot: "attachment", children: attachmentComponent }, component.id));
            }
            else {
                return attachmentComponent;
            }
        }
        case discord_js_1.ComponentType.MediaGallery:
            return (0, jsx_runtime_1.jsx)(Media_Gallery_1.default, { component: component }, id);
        case discord_js_1.ComponentType.Section:
            return ((0, jsx_runtime_1.jsx)(Section_1.default, { accessory: component.accessory, id: id, children: component.components.map((nestedComponent, id) => ((0, jsx_runtime_1.jsx)(ComponentRow, { component: nestedComponent, id: id, context: context }, id))) }, id));
        case discord_js_1.ComponentType.Separator:
            return (0, jsx_runtime_1.jsx)(Spacing_1.default, { spacing: component.spacing, divider: component.divider }, id);
        case discord_js_1.ComponentType.TextDisplay:
            return (0, jsx_runtime_1.jsx)(content_1.default, { content: component.content, context: Object.assign(Object.assign({}, context), { type: content_2.RenderType.NORMAL }) }, id);
        default:
            return null;
    }
}
function Component({ component, id, }) {
    var _a;
    switch (component.type) {
        case discord_js_1.ComponentType.Button:
            return ((0, jsx_runtime_1.jsx)(Button_1.default, { type: styles_1.ButtonStyleMapping[component.style], url: (_a = component.url) !== null && _a !== void 0 ? (0, utils_1.safeLinkHref)(_a) : undefined, emoji: component.emoji ? (0, utils_1.parseDiscordEmoji)(component.emoji) : undefined, children: component.label }, id));
        case discord_js_1.ComponentType.StringSelect:
        case discord_js_1.ComponentType.UserSelect:
        case discord_js_1.ComponentType.RoleSelect:
        case discord_js_1.ComponentType.MentionableSelect:
        case discord_js_1.ComponentType.ChannelSelect:
            return (0, jsx_runtime_1.jsx)(Select_Menu_1.default, { component: component }, id);
        case discord_js_1.ComponentType.Thumbnail:
            return (0, jsx_runtime_1.jsx)(Thumbnail_1.default, { url: (0, utils_1.safeImageSrc)(component.media?.url) }, id);
        default:
            return undefined;
    }
}
//# sourceMappingURL=components.js.map
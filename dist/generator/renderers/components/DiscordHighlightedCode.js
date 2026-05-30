"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordHighlightStyles = void 0;
exports.DiscordHighlightedCode = DiscordHighlightedCode;
const jsx_runtime_1 = require("react/jsx-runtime");
const highlight_js_1 = __importDefault(require("highlight.js"));
// styles from https://github.com/cherryblossom000/discord-syntax-highlighting/tree/main
exports.DiscordHighlightStyles = `
  .hljs-ansi-control-sequence {
  	display: none;
  }

  .hljs-ansi-style-bold {
	  font-weight: 700;
  }

  .hljs-ansi-style-underline {
  	text-decoration: underline;
  }

  .hljs-ansi-foreground-black .hljs-ansi-background-black,
  .hljs-ansi-foreground-black .hljs-ansi-background-blue,
  .hljs-ansi-foreground-black .hljs-ansi-background-cyan,
  .hljs-ansi-foreground-black .hljs-ansi-background-green,
  .hljs-ansi-foreground-black .hljs-ansi-background-magenta,
  .hljs-ansi-foreground-black .hljs-ansi-background-red,
  .hljs-ansi-foreground-black .hljs-ansi-background-white,
  .hljs-ansi-foreground-black .hljs-ansi-background-yellow {
  	color: #073642;
  }

  .hljs-ansi-foreground-red {
	color: #dc322f;
  }

  .hljs-ansi-foreground-green {
	color: #859900;
  }

  .hljs-ansi-foreground-yellow {
	color: #b58900;
  }

  .hljs-ansi-foreground-blue {
	color: #268bd2;
  }

  .hljs-ansi-foreground-magenta {
	color: #d33682;
  }

  .hljs-ansi-foreground-cyan {
	color: #2aa198;
  }

  .hljs-ansi-foreground-white {
	color: var(--interactive-active);
  }

  .hljs-ansi-foreground-white .hljs-ansi-background-black,
  .hljs-ansi-foreground-white .hljs-ansi-background-blue,
  .hljs-ansi-foreground-white .hljs-ansi-background-cyan,
  .hljs-ansi-foreground-white .hljs-ansi-background-green,
  .hljs-ansi-foreground-white .hljs-ansi-background-magenta,
  .hljs-ansi-foreground-white .hljs-ansi-background-red,
  .hljs-ansi-foreground-white .hljs-ansi-background-white,
  .hljs-ansi-foreground-white .hljs-ansi-background-yellow {
	color: #eee8d5;
  }

  .hljs-ansi-background-black {
	background-color: #002b36;
  }

  .hljs-ansi-background-red {
	background-color: #cb4b16;
  }

  .hljs-ansi-background-green {
	background-color: #586e75;
  }

  .hljs-ansi-background-yellow {
	background-color: #657b83;
  }

  .hljs-ansi-background-blue {
	background-color: #839496;
  }

  .hljs-ansi-background-magenta {
	background-color: #6c71c4;
  }

  .hljs-ansi-background-cyan {
	background-color: #93a1a1;
  }

  .hljs-ansi-background-white {
	background-color: #fdf6e3;
  }

  .hljs-doctag,
  .hljs-keyword,
  .hljs-meta .hljs-keyword,
  .hljs-template-tag,
  .hljs-template-variable,
  .hljs-type,
  .hljs-variable.language_ {
	color: #ff7b72;
  }

  .hljs-title,
  .hljs-title.class_,
  .hljs-title.class_.inherited__,
  .hljs-title.function_ {
	color: #d2a8ff;
  }

  .hljs-attr,
  .hljs-attribute,
  .hljs-literal,
  .hljs-meta,
  .hljs-number,
  .hljs-operator,
  .hljs-selector-attr,
  .hljs-selector-class,
  .hljs-selector-id,
  .hljs-variable {
	color: #79c0ff;
  }

  .hljs-meta .hljs-string,
  .hljs-regexp,
  .hljs-string {
	color: #a5d6ff;
  }

  .hljs-built_in,
  .hljs-symbol {
	color: #ffa657;
  }

  .hljs-code,
  .hljs-comment,
  .hljs-formula {
	color: #8b949e;
  }

  .hljs-name,
  .hljs-quote,
  .hljs-selector-pseudo,
  .hljs-selector-tag {
	color: #7ee787;
  }

  .hljs-subst {
	color: #c9d1d9;
  }

  .hljs-section {
	color: #1f6feb;
	font-weight: 700;
  }

  .hljs-bullet {
	color: #f2cc60;
  }

  .hljs-emphasis {
	color: #c9d1d9;
	font-style: italic;
  }

  .hljs-strong {
	color: #c9d1d9;
	font-weight: 700;
  }

  .hljs-addition {
	color: #aff5b4;
	background-color: #033a16;
  }

  .hljs-deletion {
	color: #ffdcd7;
	background-color: #67060c;
  }
`;
function DiscordHighlightedCode(props) {
    const highlighted = props.language
        ? highlight_js_1.default.highlight(props.content, { language: props.language })
        : highlight_js_1.default.highlightAuto(props.content);
    return (0, jsx_runtime_1.jsx)("discord-code", { multiline: true, className: "theme-dark hljs", dangerouslySetInnerHTML: { __html: highlighted.value } });
}
//# sourceMappingURL=DiscordHighlightedCode.js.map
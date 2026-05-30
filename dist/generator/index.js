"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
        }
    return t;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = render;
exports.renderToStream = renderToStream;
const jsx_runtime_1 = require("react/jsx-runtime");
const static_1 = require("react-dom/static");
const buildProfiles_1 = require("../utils/buildProfiles");
const client_1 = require("../static/client");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const transcript_1 = __importDefault(require("./transcript"));
const utils_1 = require("../utils/utils");
const styles_1 = require("./renderers/components/styles");
const DiscordImage_1 = require("./renderers/components/DiscordImage");
const DiscordHighlightedCode_1 = require("./renderers/components/DiscordHighlightedCode");

// Lock to an exact resolved version — semver ranges in src= aren't cacheable by CDNs.
let discordComponentsVersion = '4.0.2';
try {
    const packagePath = path_1.default.join(__dirname, '..', '..', 'package.json');
    const packageJSON = JSON.parse((0, fs_1.readFileSync)(packagePath, 'utf8'));
    const v = (_a = packageJSON.dependencies['@skyra/discord-components-core']) !== null && _a !== void 0 ? _a : discordComponentsVersion;
    const cleaned = String(v).replace(/^[\^~]/, '');
    if (/^\d+\.\d+\.\d+/.test(cleaned)) discordComponentsVersion = cleaned;
} catch (_b) { /* ignore */ }

function computeStats(messages) {
    let images = 0;
    let humans = new Set();
    let firstTs = null, lastTs = null;
    for (const m of messages) {
        if (m.attachments && m.attachments.forEach) {
            m.attachments.forEach((a) => {
                if (typeof a.contentType === 'string' && a.contentType.startsWith('image/')) images++;
            });
        }
        if (m.author && !m.author.bot) humans.add(m.author.id);
        const ts = m.createdAt instanceof Date ? m.createdAt.getTime() : (snowflakeToDate(m.id)?.getTime() || null);
        if (ts) {
            if (firstTs === null || ts < firstTs) firstTs = ts;
            if (lastTs === null || ts > lastTs) lastTs = ts;
        }
    }
    return {
        messageCount: messages.length,
        participantCount: humans.size,
        imageCount: images,
        firstTs,
        lastTs,
        spanMs: firstTs && lastTs ? lastTs - firstTs : null,
    };
}

function snowflakeToDate(id) {
    try {
        const DISCORD_EPOCH = 1420070400000n;
        const ms = (BigInt(id) >> 22n) + DISCORD_EPOCH;
        return new Date(Number(ms));
    } catch (_e) { return null; }
}

function buildDateSeparators(messages, lang) {
    const seps = new Array(messages.length).fill(null);
    let lastYmd = null;
    // FIX: use local date (matches what the formatter shows). UTC keys were mismatched with the
    // local-time formatter output, causing the wrong day label near midnight UTC.
    const fmt = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const d = m.createdAt instanceof Date ? m.createdAt : snowflakeToDate(m.id);
        if (!d) continue;
        const ymd = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (ymd !== lastYmd) {
            seps[i] = fmt.format(d);
            lastYmd = ymd;
        }
    }
    return seps;
}

async function render(_a) {
    var _b;
    var { messages, channel, callbacks } = _a, options = __rest(_a, ["messages", "channel", "callbacks"]);

    const lang = options.language && client_1.defaultDicts[options.language] ? options.language : 'en';
    const i18n = options.i18n
        ? Object.fromEntries(Object.keys(client_1.defaultDicts).map((k) => [k, Object.assign({}, client_1.defaultDicts[k], options.i18n[k] || {})]))
        : client_1.defaultDicts;

    // Single-pass collector (profiles + extended in one walk)
    const allCtx = await (0, buildProfiles_1.buildAllContext)(messages, channel).catch((e) => {
        console.warn('[discord-html-transcripts-fix] buildAllContext failed:', e?.message || e);
        return { profiles: {}, users: {}, roles: {}, channels: {} };
    });

    const stats = computeStats(messages);
    const dateSeps = buildDateSeparators(messages, lang);

    const globalData = {
        profiles: allCtx.profiles,
        users: allCtx.users,
        roles: allCtx.roles,
        channels: allCtx.channels,
        lang,
        i18n,
        stats,
    };

    const renderContext = Object.assign({ lang, i18n, dateSeps, stats }, callbacks ? { callbacks } : {});

    const docTree = (0, jsx_runtime_1.jsxs)("html", { lang, children: [
        (0, jsx_runtime_1.jsxs)("head", { children: [
            (0, jsx_runtime_1.jsx)("meta", { charSet: "utf-8" }),
            (0, jsx_runtime_1.jsx)("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
            (0, jsx_runtime_1.jsx)("link", { rel: "preconnect", href: "https://cdn.jsdelivr.net/" }),
            (0, jsx_runtime_1.jsx)("link", { rel: "preconnect", href: "https://cdn.discordapp.com" }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.ggSansFont } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: styles_1.globalStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.mentionPopupStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.transcriptUtils } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.searchBarStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.lightboxStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.tocStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.dateSeparatorStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.markdownStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: client_1.filterPanelStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: DiscordImage_1.DiscordAttachmentStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: DiscordHighlightedCode_1.DiscordHighlightStyles } }),
            (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: extraStyles } }),
            (0, jsx_runtime_1.jsx)("link", { rel: "icon", type: "image/png", href: options.favicon === 'guild'
                    ? channel.isDMBased()
                        ? undefined
                        : ((_b = channel.guild.iconURL({ size: 16, extension: 'png' })) !== null && _b !== void 0 ? _b : undefined)
                    : options.favicon }),
            (0, jsx_runtime_1.jsx)("title", { children: channel.isDMBased() ? 'Direct Messages' : channel.name }),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.scrollToMessage } }),
            // Non-blocking inline JSON: type="application/json" so the parser doesn't pause
            (0, jsx_runtime_1.jsx)("script", { id: "dht-data", type: "application/json", dangerouslySetInnerHTML: { __html: (0, utils_1.safeJsonForScript)(globalData) } }),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: 'try{globalThis.$discordMessage=JSON.parse(document.getElementById("dht-data").textContent);}catch(e){globalThis.$discordMessage={};}' } }),
            // Always load the @skyra/discord-components-core ES module, even
            // when `hydrate: true` is requested. Lit SSR does not reliably
            // expand every <discord-*> custom element to plain HTML, and the
            // browser-side definitions are also needed to hydrate the SSR'd
            // markup (re-render with state, click handlers, etc.). Without
            // this tag the page is just static unstyled custom elements.
            (0, jsx_runtime_1.jsx)("script", { type: "module", src: `https://cdn.jsdelivr.net/npm/@skyra/discord-components-core@${discordComponentsVersion}/+esm`, crossOrigin: "anonymous" }),
        ] }),
        (0, jsx_runtime_1.jsxs)("body", { style: { margin: 0, minHeight: '100vh' }, children: [
            (0, jsx_runtime_1.jsx)(transcript_1.default, Object.assign({ messages, channel, callbacks }, options, renderContext)),
            renderStatsFooter(stats, lang, i18n, options.statsFooter),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.mentionPopup } }),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.searchBar } }),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.lightbox } }),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.toc } }),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.filterPanel } }),
            (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.codeCopyButton } }),
            options.hydrate && (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: { __html: client_1.revealSpoiler } }),
        ] })
    ] });

    const { prelude } = await (0, static_1.prerenderToNodeStream)(docTree);

    if (options.hydrate) {
        const markup = await (0, utils_1.streamToString)(prelude);
        const { render: renderLit } = await import('@lit-labs/ssr');
        const result = renderLit(markup);
        const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
        return await collectResult(result);
    }

    if (options.returnType === 'stream' || options.stream) {
        // Return the underlying Node stream — caller is responsible for piping.
        return prelude;
    }
    return await (0, utils_1.streamToString)(prelude);
}

async function renderToStream(args) {
    return render(Object.assign({}, args, { returnType: 'stream' }));
}

function formatSpan(ms, lang) {
    if (!ms || ms < 0) return '';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return '<1m';
}
// Renders the bottom stats footer. Caller-controlled via options.statsFooter:
//   false                            → no footer
//   { enabled: false }               → no footer
//   { template: '{messages} ...' }   → render with custom template
//                                      Placeholders: {messages} {participants}
//                                      {images} {from} {to} {span}
// Default: en template "X messages · Y participants · Z images · from → to · span"
function renderStatsFooter(stats, lang, i18n, opts) {
    if (opts === false) return null;
    const config = (opts && typeof opts === 'object') ? opts : {};
    if (config.enabled === false) return null;

    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    const fmtDate = (ms) => ms ? new Date(ms).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '';
    const span = stats.spanMs ? formatSpan(stats.spanMs) : '';

    const values = {
        messages: String(stats.messageCount),
        participants: String(stats.participantCount),
        images: String(stats.imageCount),
        from: fmtDate(stats.firstTs),
        to: fmtDate(stats.lastTs),
        span,
    };

    if (typeof config.template === 'string' && config.template.length > 0) {
        const rendered = config.template.replace(/\{(messages|participants|images|from|to|span)\}/g, (_, k) => values[k] || '');
        return (0, jsx_runtime_1.jsx)("footer", { className: "dht-stats", children: rendered });
    }

    const dict = (i18n && i18n[lang]) || (i18n && i18n.en) || {};
    const parts = [
        (dict.statsMessages || '{n} messages').replace('{n}', values.messages),
        (dict.statsParticipants || '{n} participants').replace('{n}', values.participants),
        (dict.statsImages || '{n} images').replace('{n}', values.images),
    ];
    if (values.from && values.to) parts.push(values.from + ' → ' + values.to);
    if (values.span) parts.push(values.span);
    return (0, jsx_runtime_1.jsx)("footer", { className: "dht-stats", children: parts.join(' · ') });
}

const extraStyles = `
/* Ensure the host establishes a positioning context for the absolute pin indicator,
   and clamp it inside the message box on narrow viewports. */
/* Action-row buttons — Discord-like horizontal spacing */
discord-action-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.dht-v2-container discord-action-row,.dht-section-content discord-action-row{margin:6px 0}
/* V2 container — Discord-like spacing inside block flow */
.dht-v2-container .dht-heading,.dht-section-content .dht-heading{margin:8px 0 4px}
.dht-v2-container .dht-heading:first-child,.dht-section-content .dht-heading:first-child{margin-top:0}
.dht-v2-container .dht-v2-separator,.dht-section-content .dht-v2-separator{margin:8px 0}
.dht-v2-container strong,.dht-section-content strong{display:inline;font-weight:700;color:#fff}
.dht-v2-container .dht-mention,.dht-section-content .dht-mention{display:inline-block;vertical-align:baseline}
/* System-message author — clickable like a user mention */
.dht-sys-author{cursor:pointer;font-style:normal;font-weight:500}
.dht-sys-author:hover{text-decoration:underline}
.dht-msg-pinned{position:relative}
.dht-app-badge,.dht-popup-badge{background:#5865F2;color:#fff;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle;font-weight:600}
.dht-edit-marker{color:#949ba4;font-size:11px;margin-left:4px;cursor:help}
.dht-suppressed{color:#6e727a;font-size:11px;font-style:italic}
.dht-stickers{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.dht-sticker{width:160px;height:160px;border-radius:8px;object-fit:contain;background:rgba(255,255,255,.02)}
.dht-poll{border:1px solid #2b2d31;background:#1e1f22;border-radius:8px;padding:12px 14px;margin-top:6px;max-width:480px}
.dht-poll-q{font-weight:700;margin-bottom:8px;font-size:15px}
.dht-poll-answers{display:flex;flex-direction:column;gap:6px}
.dht-poll-a{background:#2b2d31;border-radius:6px;padding:6px 10px;position:relative;overflow:hidden}
.dht-poll-bar{position:absolute;top:0;left:0;height:100%;background:rgba(88,101,242,.25);z-index:0}
.dht-poll-line{position:relative;z-index:1;display:flex;justify-content:space-between;gap:8px}
.dht-poll-pct{color:#b5bac1;font-size:12px;white-space:nowrap}
.dht-poll-foot{margin-top:8px;font-size:11px;color:#949ba4}
.dht-voice{display:inline-flex;align-items:center;gap:8px;background:#2b2d31;padding:6px 12px;border-radius:8px;color:#dbdee1;font-size:13px;margin:4px 0}
.dht-voice-wave svg{display:block}
.dht-voice-dur{color:#b5bac1;font-size:11px}
.dht-forwarded-wrap{margin:4px 0}
.dht-forwarded{border-left:3px solid #5865F2;background:rgba(88,101,242,.06);padding:6px 10px;border-radius:0 6px 6px 0;margin-bottom:4px}
.dht-forwarded-head{font-size:12px;color:#949ba4;margin-bottom:2px}
.dht-forwarded-icon{margin-right:4px}
.dht-forwarded-body{color:#dbdee1}
.dht-forwarded-attachments{margin-top:4px;font-size:11px;color:#949ba4}
.dht-edit-history{font-size:12px;color:#b5bac1;margin-top:4px}
.dht-edit-history summary{cursor:pointer;color:#949ba4}
.dht-edit-history li{margin-top:4px}
.dht-edit-history time{display:block;color:#6e727a;font-size:10px;margin-bottom:2px}
.dht-thread-badge{display:inline-block;background:#3f4248;color:#dbdee1;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px}
.dht-thread-badge--locked{background:#ED4245}
.dht-thread-badge--archived{background:#6c757d}
.dht-gifv{max-width:400px;max-height:300px;border-radius:6px}
.dht-stats{margin:24px auto;padding:12px;text-align:center;color:#b5bac1;font-size:13px;font-family:"gg sans",sans-serif;border-top:1px solid #2b2d31;max-width:800px}
.dht-mention--cmd{background:rgba(88,101,242,.22)!important}
.dht-embed-provider{color:#949ba4;font-size:11px;margin-bottom:2px}
.dht-embed-video{margin-top:6px;font-size:13px}
.dht-embed-video a{color:#8ab4ff;text-decoration:none}
.dht-embed-video a:hover{text-decoration:underline}
.dht-automod-rule{font-size:11px;color:#949ba4}
.dht-automod-content{margin:4px 0 0 12px;color:#dbdee1;border-left:3px solid #f23f42;padding-left:8px;font-size:13px}
.dht-reaction--burst{box-shadow:inset 0 0 0 1px gold}
`;
//# sourceMappingURL=index.js.map

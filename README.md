# `discord-html-transcripts-fix`

[![npm version](https://img.shields.io/npm/v/discord-html-transcripts-fix.svg)](https://www.npmjs.com/package/discord-html-transcripts-fix)
[![license](https://img.shields.io/npm/l/discord-html-transcripts-fix.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/discord-html-transcripts-fix.svg)](https://nodejs.org)

A nicely formatted HTML transcript generator for [discord.js](https://discord.js.org/) with full **Components V2** support, an **interactive viewer**, and **hardened security**.

Forked from [discord-html-transcripts](https://github.com/ItzDerock/discord-html-transcripts).

## Requirements

- **Node.js ≥ 20** — the image downloader uses `undici` v7.
- **discord.js v14 or v15** — required peer dependency.
- **[`sharp`](https://sharp.pixelplumbing.com/)** — *optional* peer dependency, only needed if you use `.withCompression()` to compress / convert transcript images to WebP.

The **generated HTML** additionally reaches out to third-party CDNs when it is *opened*
— jsDelivr for the `<discord-*>` component runtime and the gg sans font, cdnjs for
Twemoji SVGs. Set [`inlineAssets: true`](#self-contained-transcripts) to embed them and
get a file that renders offline.

## Install

```bash
npm install discord-html-transcripts-fix
```

`discord.js` is the only **required** peer dependency — React, the markdown parser, etc. are installed automatically. `sharp` is an optional peer (image compression only).

The install is clean: no deprecation warnings and no `npm audit` findings.

## Quick start

```js
const { createTranscript } = require('discord-html-transcripts-fix');

const attachment = await createTranscript(channel, {
    limit: -1,        // fetch every message
    saveImages: false,
});

await channel.send({ files: [attachment] });
```

### TypeScript

In TypeScript, use the `ExportReturnType` enum for `returnType` (the return value is typed accordingly):

```ts
import { createTranscript, ExportReturnType } from 'discord-html-transcripts-fix';

const html = await createTranscript(channel, {
    returnType: ExportReturnType.String, // => Promise<string>
    language: 'de',
});

const stream = await createTranscript(channel, {
    returnType: ExportReturnType.Stream, // => Promise<Readable>, ideal for huge tickets
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `-1` | Max messages to fetch. `-1` = recursive (all). |
| `filter` | `(m) => boolean` | `() => true` | Predicate to filter messages. |
| `returnType` | `'attachment'` \| `'buffer'` \| `'string'` \| `'stream'` | `'attachment'` | Return value shape. In TypeScript pass the `ExportReturnType` enum. `'stream'` returns a Node `Readable` and is best for 5k+ message exports. |
| `filename` | `string` | `transcript-{channel-id}.html` | Output filename when returning as attachment. |
| `saveImages` | `boolean` | `false` | Download image **attachments** and inline them as base64 data URLs. Avatars, embed images and custom emoji keep loading from Discord. |
| `favicon` | `'guild'` \| `string` | `'guild'` | Page favicon — `'guild'` uses the server icon, or pass a URL. |
| `hydrate` | `boolean` | `false` | Enables the client-side spoiler-reveal script. |
| `inlineAssets` | `boolean` | `false` | Embed the component runtime, the gg sans font and the emoji so the file renders without third-party CDNs. See below. |
| `inlineAssetsTimeout` | `number` | `30000` | Timeout in ms for each of those downloads, connection setup included. |
| `dateFormat` | `'dd/mm/yyyy'` \| `'mm/dd/yyyy'` | `'dd/mm/yyyy'` | Date order for message timestamps older than yesterday. |
| `timeFormat` | `'24h'` \| `'12h'` | `'24h'` | Clock format for message timestamps — `07:16` vs `07:16 AM`. |
| `language` | `'en'` \| `'de'` | `'en'` | UI language for participant labels, filter strings, etc. |
| `i18n` | `Partial<Record<lang, Record<key,string>>>` | — | Override individual strings per language. |
| `statsFooter` | `false` \| `{ enabled?, template? }` | `{ enabled: true }` | Bottom stats line. See below. |
| `footerText` | `string` | `Exported {number} message{s}.` | Legacy "Exported X messages" line. Only renders when `statsFooter` is disabled. |
| `poweredBy` | `boolean` | `false` | Show the original "Powered by discord-html-transcripts" credit link. Only renders when `statsFooter` is disabled. |
| `callbacks` | `{ resolveUser, resolveRole, resolveChannel, resolveImageSrc }` | — | Custom resolvers for mentions / image URLs. |

### Self-contained transcripts

By default the rendered file is not standalone: opening it fetches the `<discord-*>`
component runtime and the gg sans font from jsDelivr and the emoji SVGs from cdnjs.
Offline, on a network that blocks those CDNs, or after a CDN outage the transcript
renders unstyled — and every viewer's IP reaches both CDNs, which can matter for
archived tickets.

```js
await createTranscript(channel, {
    inlineAssets: true,
    saveImages: true, // also embeds image attachments
});
```

`inlineAssets` embeds the component runtime, all ten gg sans font files and every emoji
the transcript shows, so opening the file makes **no request to a third-party CDN**.
Verified in a browser: it renders like the CDN version — reactions included — loads the
runtime from about 35 `blob:` modules, and the only remaining network request goes to
Discord's own CDN for avatars.

| | Default | `inlineAssets: true` |
| --- | --- | --- |
| File size | ~72 kB | ~960 kB |
| Hosts contacted on open | jsDelivr, cdnjs, Discord CDN | Discord CDN only (`cdn.discordapp.com`, `media.discordapp.net`) |
| Without network | unstyled | styled; avatars, and attachments unless `saveImages` is set, are missing |

What stays on Discord's CDN: avatars always; attachment images unless `saveImages` is
set; embed images, stickers, custom emoji and Components V2 media. Emoji typed as URLs
in messages are never rewritten — only the images the renderer itself emits are
embedded.

The downloads happen once per process and are cached, and concurrent exports share
them, so the first transcript pays about a second and later ones are unaffected. If an
asset cannot be fetched the CDN reference is kept and a warning naming the cause is
logged — the export never fails over this:

- A CDN that is unreachable or answers 5xx is given up on after the first failed wave
  instead of waiting out the timeout for every file, and retried a minute later.
- A response that is not the expected file (a captive portal or error page answering
  `200`) is never embedded and never cached.
- Emoji newer than Twemoji 14.0.2 do not exist on the CDN at all; they are reported once
  per process instead of on every export.
- A bug in the inliner itself goes to `console.error` with its stack rather than being
  reported as a CDN problem.

`inlineAssetsTimeout` (default `30000` ms) caps each download, connection setup
included; numeric strings from environment variables are accepted. Per-file details are
available with `DEBUG=discord-html-transcripts:selfContained`. With a stream return type
the document is buffered before it is streamed, so `stream` saves no memory in
combination with `inlineAssets`.

### Message timestamps

Timestamps are worded the way Discord words them, relative to when the transcript was
generated:

| When the message was sent | Rendered as |
| --- | --- |
| Today | `07:16` |
| Yesterday | `Yesterday at 07:16` (`Gestern um 07:16` with `language: 'de'`) |
| Anything older | `11/08/2026 07:16` |

The reference point is transcript creation time, so an archived transcript keeps saying
the same thing no matter when it is opened. The exact instant stays machine-readable in
`data-timestamp` (epoch ms) and `data-timestamp-iso` on every `<discord-message>`.

```js
await createTranscript(channel, {
    dateFormat: 'mm/dd/yyyy', // default 'dd/mm/yyyy'
    timeFormat: '12h',        // default '24h'
});
// → "07:16 AM", "Yesterday at 10:45 PM", "08/11/2026 02:30 PM"
```

Times use the timezone of the machine generating the transcript.

### Configurable stats footer

```js
await createTranscript(channel, {
    statsFooter: {
        template: '{messages} messages from {participants} people · {images} images · {from} → {to}',
    },
});

// Or disable entirely:
await createTranscript(channel, { statsFooter: false });
```

Placeholders: `{messages}`, `{participants}`, `{images}`, `{from}`, `{to}`, `{span}`.

### Image compression (optional)

`saveImages: true` inlines images as base64 without any extra dependency. To additionally
compress them (and optionally convert to WebP), install `sharp` and build a custom downloader:

```js
const { createTranscript, TranscriptImageDownloader } = require('discord-html-transcripts-fix');

const resolveImageSrc = new TranscriptImageDownloader()
    .withMaxSize(2048)            // KB per image
    .withConcurrency(8)           // parallel downloads (default 6)
    .withCompression(80, true)    // quality 80, convert to WebP — requires `sharp`
    .build();

await createTranscript(channel, { saveImages: true, callbacks: { resolveImageSrc } });
```

### Optional edit history

If your bot tracks edits, attach them to the message *before* rendering:

```js
message.editHistory = [
    { content: 'first version',     editedAt: new Date('2026-05-13T11:02Z') },
    { content: 'corrected version', editedAt: new Date('2026-05-13T11:05Z') },
];
```

The viewer will render a collapsible `<details>` block next to the `(edited)` marker.

## Interactive viewer

One floating button sits **top-right** — the hamburger menu. It opens a sidebar containing:

- **Live search** at the top — keyword highlighting (`n of N` matches with prev/next), Ctrl/Cmd-F focuses this field
- **Participants** (collapsible, open by default) — sorted list of authors; click to jump to their first message
- **Filter** (collapsible, open by default) — author, role, date range, pinned-only, has-image, has-embed, has-attachment, has-container/V2

Inline behaviour:

- **Clickable mentions** — user/role/channel pills open a Discord-style popup with avatar, display name, username, role pills (colored), server-since, account-since, color, member count, channel topic, etc.
- **Clickable message authors** — clicking the avatar or username on a regular message, or the author name on a system message ("X pinned a message…"), opens the same user popup.
- **Clickable slash commands** — `<discord-command>` pills open a popup listing the resolved command and every parameter (`name: value`).
- **Copy buttons** — user ID, role ID, channel ID, username, color hex, command name, and every slash parameter value get a one-click clipboard button in the popup.
- **Image lightbox** — click any image to open fullscreen, arrow keys to navigate, Escape to close.
- **Date separators** between messages — `Tuesday, May 13 2026` style, automatically inserted on day boundaries.
- **Author name color** uses the **highest listed role's color**, matching the Discord client.

## Content rendered

In addition to plain text, replies, embeds, and attachments, the viewer supports:

- **Components V2** — Containers, Sections, Text Display, Media Gallery, Thumbnail, File, Separator, with accent colors and spoiler support
- **Action rows** — buttons with proper spacing and Discord-style colors (`primary`, `secondary`, `success`, `destructive`)
- **Stickers** — PNG, APNG, GIF, Lottie placeholder
- **Polls** — question, answer bars with vote counts and percentages, expiry
- **Forwarded messages** (`messageSnapshots`) — quoted-block style with their text, attachments, embeds and components, naming the source channel (same server only, and never the original author, which Discord hides), recursive nesting; a forward whose snapshot is missing is marked as unavailable
- **Voice messages** — `🎤` indicator, inline SVG waveform from `attachment.waveform`, duration
- **Pinned messages** — Discord-style amber left rail (no extra icon clutter)
- **Slash command interactions** — `{user} used /cmd` header + clickable pill that reveals parameters
- **System messages** — `ChannelPinnedMessage`, `ChannelNameChange`, `ChannelIconChange`, `ThreadCreated`, `ChatInputCommand`, `ContextMenuCommand`, `Call`, `ChannelFollowAdd`, `RecipientRemove`, `RoleSubscriptionPurchase`, guild incident reports, poll result, AutoMod actions, and any other type as a neutral "System message" line
- **Cross-guild replies** — show a "Message from another server" pill
- **Burst / super-reactions** flagged
- **Thread state badges** — `Archived`, `Locked`
- **GIFV / animated GIFs** — `<video autoplay loop muted>` like Discord
- **Attachment description (alt text)** used as `alt`/`title`
- **`<id:guide>`, `<id:browse>`, `<id:customize>`** pseudo-channels → styled pills with proper labels
- **`</cmd:id>` slash command mentions** → blue monospace pills
- **Embed video** link and **embed provider** ("YouTube" etc.) shown
- **Edit history** with collapsible `<details>` (opt-in via `message.editHistory`)
- **Suppressed embeds flag** is honored — when set, embeds aren't rendered (a small `(embeds hidden)` note is shown)

## Changes vs. the original

### Security

- **Critical fix** `</script>` breakout via inlined JSON is prevented (`<`, `>`, `&`, U+2028/2029 escaped)
- **Critical fix** markdown links with `javascript:`, `data:`, `vbscript:` and other dangerous URI schemes are rewritten to `#`
- **Hardened** inline `style="color:…"` sinks in the mention popup are hex-validated to block CSS injection
- **Hardened** `data:` URI MIME types from the image downloader are restricted to image types only (no `text/html` smuggling)
- **Hardened** URLs that components render without checking them: image sources (embed author icons, thumbnails, images and footer icons, Components V2 thumbnails and media galleries) only pass as web URLs, inline images or `attachment://`; links (link buttons, Components V2 file links) only as web, `mailto:`, `discord:` or `attachment://` links. A `javascript:` file link in a Components V2 message used to stay clickable
- **Fixed** `process.exit(1)` on discord.js version mismatch removed — library no longer kills the host bot

### Robustness

- **Fix** invalid Discord timestamp markers (`<t:abc:F>`, oversized values) no longer abort the transcript with `RangeError`
- **Fix** per-AST-node error boundary in `MessageSingleASTNode` and per-message error boundary in `DiscordMessage` — one broken message can never kill the whole render
- **Fix** a failed image download with `saveImages` — or a custom `resolveImageSrc` that throws — no longer fails the whole export: the image keeps its link and a warning names it
- **Fix** `parseDiscordEmoji` no longer throws on deleted reactions with `emoji.name === null`
- **Fix** `formatBytes(null/undefined/NaN)` no longer returns `NaN undefined`
- **Fix** `createTranscript` slice uses the resolved limit instead of the raw `limit`
- **Fix** `statsFooter` (custom template / `false`) is now forwarded end-to-end — it used to be silently ignored by `createTranscript`/`generateFromMessages`
- **Fix** `dateFormat`, `timeFormat`, `inlineAssets` and `inlineAssetsTimeout` are forwarded by `createTranscript`/`generateFromMessages` — 2.1.0 and 2.2.0 silently ignored them, the same way `statsFooter` once was. A test derived from the typings now fails whenever a declared option does not reach the renderer
- **Fix** `hydrate` combined with `returnType: 'stream'` / `stream: true` returns a `Readable` again instead of a string
- **Fix** `inlineAssets` hardened now that it actually runs: reaction emoji render as images instead of base64 text, user-typed URLs are never rewritten, the timeout also bounds connection setup, a CDN outage is not waited out per file, error pages are never embedded or cached, and a bug in the inliner is no longer reported as a CDN problem
- **Fix** `inlineAssets` + stream yields Buffer chunks like every other stream (a single string chunk broke `Buffer.concat`)
- **Fix** invalid `dateFormat` / `timeFormat` / `inlineAssetsTimeout` values are reported instead of silently replaced; case and numeric strings are tolerated
- **Fix** forwarded messages show their content — discord.js hands over `messageSnapshots` as a Collection, and an array check left every forward empty ("Message could not be loaded."). A forward is no longer mistaken for a reply or a cross-server message (on discord.js before 14.16 too), its header names the source channel when that channel is on the same server, and a forward whose snapshot is missing says so. The original author is never shown, as in Discord, even though discord.js hands it over when the bot has the original message cached
- **Fix** forwarded messages show their embeds and Components V2 content in full instead of a "1 embed" count, and forwarded images go through `saveImages` / `resolveImageSrc` like any other instead of staying on Discord's expiring CDN links. They also count in the stats footer and for the image, attachment and embed filters
- **Fix** link previews, GIFs (`gifv`) and video embeds get their own layout — discord.js keeps the embed type only in `embed.data`, so every embed rendered as `rich` and an image preview showed up as an empty card with a small thumbnail
- **Fix** super reactions and voice-message durations show — the renderer read the raw API names (`count_details`, `burst_colors`, `duration_secs`), which discord.js renames
- **Fix** reply authors get their role color, and embed footer icons and audio file sizes show — the values were passed as camelCase attributes, which HTML lowercases, so the components never received them. Members without a colored role are no longer painted black
- **Fix** text outside the Basic Multilingual Plane showed as pairs of `�` — fancy-font ("math italic") server and channel names, rare ideographs, symbols — in messages, embeds and Components V2 containers. The markdown parser cuts its text at every non-ASCII character and counts UTF-16 code units, so such a character arrived as two lone halves that could not be encoded. Text is merged back (and renders as one piece per run instead of one node per non-ASCII character, which also shrinks the HTML). Reply and thread previews, the search text, activity party ids and the server's initial letters no longer cut through a character either, and a server name with a double space no longer reads "Aundefined"
- **Fix** a fenced code block in a language highlight.js does not know — ` ```ansi `, ` ```log `, a typo such as `js2` — made the whole export fail, because the error was raised while rendering, outside the per-message safety net. Such blocks now show as plain text, like in Discord; `ansi` blocks lose their color escape codes
- **Fix** a role-subscription tier name containing `$&`, `$'`, `` $` `` or `$$` was altered when the message was composed; it is shown exactly as written
- **Fix** reaction counts of 1,000 and more showed `NaN` — the abbreviated "1.5K" went to a component that only reads numbers; the full count is shown now
- **Fix** system messages of types without their own wording — Server Discovery notices, invite reminders, premium upsells, purchase notifications, and any type Discord adds later — were silently dropped from the transcript. They appear as a neutral "System message" line with Discord's text now (new i18n key `systemMessage`)
- **Fix** the stats footer counts one of something in the singular — "1 message · 1 participant · 1 image" instead of "1 messages", in German too (new i18n keys `statsMessage`, `statsParticipant`, `statsImage`)
- **Fix** select menu options show their emoji instead of its URL as text, and AutoMod alerts name the channel instead of printing `<#id>` (its id remains when the server does not know it)
- **Fix** profile cards no longer depend on the order users appear in: someone first seen without member data, as the user of a slash command for example, now gets their nickname, roles and color from their own messages. One malformed user or message in plain-object input no longer drops every profile of the transcript, and a guild member that cannot be read falls back to the user's own name and avatar
- **Fix** embed fields render through a proper async component (was an inline `async` arrow inside `.map()`)
- **Fix** `JoinMessage` text is deterministic per message id — re-rendering the same channel always yields the same join line
- **Fix** random `console.log` calls in production paths replaced by the `debug` namespace

### Layout

- **Fix** Components V2 Container/Section used `display:flex;flex-direction:column;gap:8px`, which forced every inline `<strong>` / `<br>` / mention pill / text node into its own row. Switched to block flow so messages read like Discord again.
- **Fix** `<discord-system-message>` is no longer forced to `display:block`; the pin needle on "X pinned a message…" now sits at the left where Discord renders it.
- **Fix** action-row buttons no longer touch — `discord-action-row` ships an 8 px gap rule.
- **Fix** duplicate APP badge on bot/application messages removed — the web component already renders one.

### Performance

- **Single-pass profile collector** — `buildAllContext` builds profiles + extended dicts in one walk over the message list
- **Image downloader is concurrent** — bounded pool (default 6, configurable via `withConcurrency`) instead of sequential
- **`@skyra/discord-components-core` version is pinned** to an exact resolved version → CDN cacheable
- **Inline JSON** is shipped via `<script type="application/json">` so it doesn't block HTML parse
- **Emoji URL resolution** is memoized
- **`returnType: 'stream'`** option streams the rendered HTML out instead of buffering — usable for 5,000+ message tickets

### DX

- **`react`, `react-dom`, `debug` moved into regular dependencies** so users don't install them manually (`debug` was actually a missing runtime dep in the original — `images.js` requires it)
- **`sharp` declared as an optional peer dependency** — needed only for `.withCompression()`, no longer a hidden requirement
- **Discord-style message timestamps** — today shows the bare time (`07:16`), yesterday reads `Yesterday at 07:16`, anything older gets `11/08/2026 07:16`. Configurable via `dateFormat` and `timeFormat`. Previously the raw ISO string (`2026-08-14T07:16:07.422Z`) was rendered, because the web component only formats real `Date` objects and an HTML attribute always arrives as a string
- **`hydrate: true` actually works** — the markup was handed to Lit as a plain string, which Lit HTML-escapes, so the option emitted a page of visible `&lt;!DOCTYPE html&gt;…` source text instead of a transcript
- **`@lit-labs/ssr` and `lit` removed entirely** — the `hydrate` path pushed the finished markup through Lit SSR, which was measured to contribute exactly four inert `<!--lit-part-->` comments and nothing else, since the page never loads a Lit hydration client. Two dependencies and the deprecated `node-fetch → fetch-blob → node-domexception` chain for four comments. `hydrate: true` keeps its real effect (the spoiler-reveal script), and the install is now warning-free
- **`inlineAssets` option** — embeds the component runtime, the gg sans font and the emoji so a transcript opens without any third-party CDN
- **TypeScript declarations match runtime** — `ExportReturnType.Stream`, `language`, `i18n`, `stream`, and `withConcurrency()` are now exposed in the types
- `discord.js` remains the only **required** peer dependency

## API

| Export | Description |
|---|---|
| `createTranscript(channel, options?)` | Fetch a channel's messages and render a transcript. |
| `generateFromMessages(messages, channel, options?)` | Render a transcript from a message array/collection you already have. |
| `ExportReturnType` | Enum: `Attachment` \| `Buffer` \| `String` \| `Stream`. |
| `TranscriptImageDownloader` | Builder for a custom image-saving callback (`withMaxSize`, `withConcurrency`, `withCompression`, `build`). |
| `DiscordMessages` | The underlying React component, for advanced/custom rendering. |

## Development

```bash
npm test
npm run test:update
```

`npm test` runs the unit tests and the golden transcripts: every scenario in
`tests/fixtures/scenarios.js` is rendered from real discord.js objects and compared with
`tests/golden/`. After an intended change to the output, `npm run test:update` rewrites
the snapshots — review the diff before committing it.

## License

[Apache-2.0](./LICENSE) — same as the original package.

## Credits

Original package by [ItzDerock](https://github.com/ItzDerock/discord-html-transcripts).
Styles from [@derockdev/discord-components](https://github.com/ItzDerock/discord-components).

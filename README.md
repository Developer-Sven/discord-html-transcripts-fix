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

## Install

```bash
npm install discord-html-transcripts-fix
```

`discord.js` is the only **required** peer dependency — React, Lit SSR, the markdown parser, etc. are installed automatically. `sharp` is an optional peer (image compression only).

<details>
<summary>Silencing the <code>node-domexception</code> deprecation warning on install</summary>

Lit SSR depends on `node-fetch`, which still pulls in the deprecated
`fetch-blob → node-domexception` chain, so `npm install` prints:

```
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
```

It is cosmetic — install-time only, never at runtime, and `npm audit` reports nothing
for it. If you want it gone, swap `node-fetch` for a dependency-free drop-in in **your
own** `package.json` (npm only honours `overrides` in the root project, so this cannot
be shipped from here):

```json
{
  "overrides": {
    "node-fetch": "npm:node-fetch-native@^1.6.7"
  }
}
```

</details>

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
| `saveImages` | `boolean` | `false` | Download images and inline them as base64 data URLs. |
| `favicon` | `'guild'` \| `string` | `'guild'` | Page favicon — `'guild'` uses the server icon, or pass a URL. |
| `hydrate` | `boolean` | `false` | Server-side hydrate via `@lit-labs/ssr` (slower; usually leave off). |
| `dateFormat` | `'dd/mm/yyyy'` \| `'mm/dd/yyyy'` | `'dd/mm/yyyy'` | Date order for message timestamps older than yesterday. |
| `timeFormat` | `'24h'` \| `'12h'` | `'24h'` | Clock format for message timestamps — `07:16` vs `07:16 AM`. |
| `language` | `'en'` \| `'de'` | `'en'` | UI language for participant labels, filter strings, etc. |
| `i18n` | `Partial<Record<lang, Record<key,string>>>` | — | Override individual strings per language. |
| `statsFooter` | `false` \| `{ enabled?, template? }` | `{ enabled: true }` | Bottom stats line. See below. |
| `footerText` | `string` | `Exported {number} message{s}.` | Legacy "Exported X messages" line. Only renders when `statsFooter` is disabled. |
| `poweredBy` | `boolean` | `false` | Show the original "Powered by discord-html-transcripts" credit link. Only renders when `statsFooter` is disabled. |
| `callbacks` | `{ resolveUser, resolveRole, resolveChannel, resolveImageSrc }` | — | Custom resolvers for mentions / image URLs. |

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
- **Forwarded messages** (`messageSnapshots`) — quoted-block style with original author, recursive nesting
- **Voice messages** — `🎤` indicator, inline SVG waveform from `attachment.waveform`, duration
- **Pinned messages** — Discord-style amber left rail (no extra icon clutter)
- **Slash command interactions** — `{user} used /cmd` header + clickable pill that reveals parameters
- **System messages** — `ChannelPinnedMessage`, `ChannelNameChange`, `ChannelIconChange`, `ThreadCreated`, `ChatInputCommand`, `ContextMenuCommand`, `Call`, `ChannelFollowAdd`, `RecipientRemove`, `RoleSubscriptionPurchase`, guild incident reports, poll result, AutoMod actions
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
- **Fixed** `process.exit(1)` on discord.js version mismatch removed — library no longer kills the host bot

### Robustness

- **Fix** invalid Discord timestamp markers (`<t:abc:F>`, oversized values) no longer abort the transcript with `RangeError`
- **Fix** per-AST-node error boundary in `MessageSingleASTNode` and per-message error boundary in `DiscordMessage` — one broken message can never kill the whole render
- **Fix** `parseDiscordEmoji` no longer throws on deleted reactions with `emoji.name === null`
- **Fix** `formatBytes(null/undefined/NaN)` no longer returns `NaN undefined`
- **Fix** `createTranscript` slice uses the resolved limit instead of the raw `limit`
- **Fix** `statsFooter` (custom template / `false`) is now forwarded end-to-end — it used to be silently ignored by `createTranscript`/`generateFromMessages`
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
- **`lit` added as an explicit dependency** — it was previously only reachable as a transitive dependency of `@lit-labs/ssr`, which does not resolve under pnpm's strict layout
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

## License

[Apache-2.0](./LICENSE) — same as the original package.

## Credits

Original package by [ItzDerock](https://github.com/ItzDerock/discord-html-transcripts).
Styles from [@derockdev/discord-components](https://github.com/ItzDerock/discord-components).

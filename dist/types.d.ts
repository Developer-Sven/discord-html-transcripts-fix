import type { AttachmentBuilder, Message } from 'discord.js';
import type { RenderMessageContext } from './generator';
import type { Readable } from 'stream';
export declare enum AttachmentTypes {
    Audio = 0,
    Video = 1,
    Image = 2,
    File = 3
}
export declare enum ExportReturnType {
    Buffer = "buffer",
    String = "string",
    Attachment = "attachment",
    Stream = "stream"
}
export type ObjectType<T extends ExportReturnType> = T extends ExportReturnType.Buffer ? Buffer : T extends ExportReturnType.String ? string : T extends ExportReturnType.Stream ? Readable : AttachmentBuilder;
export type GenerateFromMessagesOptions<T extends ExportReturnType> = Partial<{
    /**
     * The type of object to return
     * @default ExportReturnType.ATTACHMENT
     */
    returnType: T;
    /**
     * Downloads images and encodes them as base64 data urls
     * @default false
     */
    saveImages: boolean;
    /**
     * Callbacks for resolving channels, users, and roles
     */
    callbacks: Partial<RenderMessageContext['callbacks']>;
    /**
     * The name of the file to return if returnType is ExportReturnType.ATTACHMENT
     * @default 'transcript-{channel-id}.html'
     */
    filename: string;
    /**
     * Whether to include the "Powered by discord-html-transcripts" credit link.
     * Only renders when the stats footer is disabled (`statsFooter: false`).
     * @default false
     */
    poweredBy: boolean;
    /**
     * The message right before "Powered by" text. Remember to put the {s}
     * @default 'Exported {number} message{s}.'
     */
    footerText: string;
    /**
     * Whether to show the guild icon or a custom icon as the favicon
     * 'guild' - use the guild icon
     * or pass in a url to use a custom icon
     * @default "guild"
     */
    favicon: 'guild' | string;
    /**
     * Whether to hydrate the html server-side
     * @default false - the returned html will be hydrated client-side
     */
    hydrate: boolean;
    /**
     * Stats footer rendered at the bottom (e.g. "12 messages · 3 participants · 2 images · …").
     * - `false` to disable entirely
     * - `{ enabled: false }` to disable
     * - `{ template: '{messages} Nachrichten · {participants} Teilnehmer · {images} Bilder · {from} → {to} · {span}' }`
     *   to render with a custom string. Supported placeholders:
     *   `{messages}` `{participants}` `{images}` `{from}` `{to}` `{span}`
     *
     * Defaults to the localized "X messages · Y participants · …" string.
     */
    statsFooter: false | {
        enabled?: boolean;
        template?: string;
    };
    /**
     * Date order used whenever a message timestamp is older than yesterday
     * (e.g. `11/08/2026 07:16`).
     * @default 'dd/mm/yyyy'
     */
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy';
    /**
     * Clock format for message timestamps — `'24h'` renders `07:16`,
     * `'12h'` renders `07:16 AM`.
     * @default '24h'
     */
    timeFormat: '24h' | '12h';
    /**
     * UI language for the built-in strings (participant labels, filter UI, stats footer, …).
     * @default 'en'
     */
    language: 'en' | 'de';
    /**
     * Override individual built-in strings per language. Merged over the defaults.
     * Keys are the string ids used internally (e.g. `statsMessages`, `statsParticipants`).
     */
    i18n: Partial<Record<'en' | 'de', Record<string, string>>>;
    /**
     * Return a Node `Readable` stream of the rendered HTML instead of buffering it.
     * Equivalent to `returnType: ExportReturnType.Stream`. Best for very large exports.
     * @default false
     */
    stream: boolean;
}>;
export type CreateTranscriptOptions<T extends ExportReturnType> = Partial<GenerateFromMessagesOptions<T> & {
    /**
     * The max amount of messages to fetch. Use `-1` to recursively fetch.
     */
    limit: number;
    /**
     * Filter messages of the channel
     * @default (() => true)
     */
    filter: (message: Message<boolean>) => boolean;
}>;

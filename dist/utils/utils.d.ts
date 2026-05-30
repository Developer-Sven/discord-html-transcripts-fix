import type { APIMessageComponentEmoji, Emoji } from 'discord.js';
export declare function isDefined<T>(value: T | undefined | null): value is T;
/**
 * Returns a tuple of [bytes (i.e. 1024), bytesUnit (i.e. KB)]
 * @param bytes
 * @param decimals
 * @returns
 */
export declare function formatBytes(bytes: number, decimals?: number): [number, string];
export declare function parseDiscordEmoji(emoji: Emoji | APIMessageComponentEmoji): string;
/**
 * Converts a stream to a string
 * @param stream - The stream to convert
 */
export declare function streamToString(stream: NodeJS.ReadableStream): Promise<string>;

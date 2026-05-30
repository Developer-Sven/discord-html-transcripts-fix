import type { Embed, Message } from 'discord.js';
import type { RenderMessageContext } from '..';
type RenderEmbedContext = RenderMessageContext & {
    index: number;
    message: Message;
};
export declare function DiscordEmbed({ embed, context }: {
    embed: Embed;
    context: RenderEmbedContext;
}): Promise<import("react/jsx-runtime").JSX.Element>;
export {};

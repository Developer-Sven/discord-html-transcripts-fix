import { type Message as MessageType } from 'discord.js';
import type { RenderMessageContext } from '..';
export default function DiscordMessage({ message, context, }: {
    message: MessageType;
    context: RenderMessageContext;
}): Promise<import("react/jsx-runtime").JSX.Element>;

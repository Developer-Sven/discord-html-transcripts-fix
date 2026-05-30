import { type Message } from 'discord.js';
import type { RenderMessageContext } from '..';
export default function MessageReply({ message, context }: {
    message: Message;
    context: RenderMessageContext;
}): Promise<import("react/jsx-runtime").JSX.Element | null>;

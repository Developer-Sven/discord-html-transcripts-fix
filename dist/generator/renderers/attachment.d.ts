import { Attachment as AttachmentType, Message } from 'discord.js';
import type { RenderMessageContext } from '..';
/**
 * Renders all attachments for a message
 * @param message
 * @param context
 * @returns
 */
export declare function Attachments(props: {
    message: Message;
    context: RenderMessageContext;
}): Promise<import("react/jsx-runtime").JSX.Element | import("react/jsx-runtime").JSX.Element[]>;
/**
 * Renders one Discord Attachment
 * @param props - the attachment and rendering context
 */
export declare function Attachment({ attachment, context, message, }: {
    attachment: AttachmentType;
    context: RenderMessageContext;
    message: Message;
}): Promise<import("react/jsx-runtime").JSX.Element>;

import type { RenderMessageContext } from '.';
/**
 * The core transcript component.
 * Expects window.$discordMessage.profiles to be set for profile information.
 *
 * @param props Messages, channel details, callbacks, etc.
 * @returns
 */
export default function DiscordMessages({ messages, channel, callbacks, ...options }: RenderMessageContext): Promise<import("react/jsx-runtime").JSX.Element>;

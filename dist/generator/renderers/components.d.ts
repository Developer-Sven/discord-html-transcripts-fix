import { type ThumbnailComponent, type MessageActionRowComponent, type TopLevelComponent } from 'discord.js';
import type { RenderMessageContext } from '..';
export default function ComponentRow({ component, id, context, }: {
    component: TopLevelComponent;
    id: number;
    context: RenderMessageContext;
}): import("react/jsx-runtime").JSX.Element | null;
export declare function Component({ component, id, }: {
    component: MessageActionRowComponent | ThumbnailComponent;
    id: number;
}): import("react/jsx-runtime").JSX.Element | undefined;

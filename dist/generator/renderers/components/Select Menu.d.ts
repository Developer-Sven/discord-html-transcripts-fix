import { type MessageActionRowComponent, ComponentType } from 'discord.js';
declare function DiscordSelectMenu({ component, }: {
    component: Exclude<MessageActionRowComponent, {
        type: ComponentType.Button;
    }>;
}): import("react/jsx-runtime").JSX.Element;
export default DiscordSelectMenu;

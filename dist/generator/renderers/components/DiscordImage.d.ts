export type DiscordImageAttachmentProps = {
    url: string;
    alt?: string;
};
export declare const DiscordAttachmentStyles = "\n  .discord-attachment-container {\n    display: block;\n    position: relative;\n    max-width: min(100%, 525px);\n  }\n\n  .discord-attachment-container > img {\n    max-width: 100%;\n    border-radius: 8px;\n  }\n";
export declare function DiscordImageAttachment(props: DiscordImageAttachmentProps): import("react/jsx-runtime").JSX.Element;

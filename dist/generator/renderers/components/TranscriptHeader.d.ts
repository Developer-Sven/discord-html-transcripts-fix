import { type ReactNode } from 'react';
export type TranscriptHeaderProps = {
    guildName: string;
    channelName: string;
    guildIcon?: string;
    children?: ReactNode;
};
export declare function TranscriptHeader(props: TranscriptHeaderProps): import("react/jsx-runtime").JSX.Element;

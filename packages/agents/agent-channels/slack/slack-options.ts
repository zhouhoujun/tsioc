export interface SlackAgentChannelOptions {
    botToken?: string;
    appToken?: string;
    signingSecret?: string;
    allowedChannelIds?: string[];
    allowedUserIds?: string[];
    defaultRecipient?: string;
}

export const defaultSlackAgentChannelOptions: SlackAgentChannelOptions = {};

export interface DiscordAgentChannelOptions {
    botToken?: string;
    applicationId?: string;
    allowedGuildIds?: string[];
    allowedChannelIds?: string[];
    dmPolicy?: 'open' | 'disabled';
    defaultRecipient?: string;
}

export const defaultDiscordAgentChannelOptions: DiscordAgentChannelOptions = {
    dmPolicy: 'open'
};

export interface MattermostAgentChannelOptions {
    serverUrl?: string;
    botToken?: string;
    webhookUrl?: string;
    botTeam?: string;
    allowedChannelIds?: string[];
    defaultRecipient?: string;
}

export const defaultMattermostAgentChannelOptions: MattermostAgentChannelOptions = {};

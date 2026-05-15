export interface TelegramAgentChannelOptions {
    botToken?: string;
    baseUrl?: string;
    allowedUserIds?: string[];
    allowedChatIds?: string[];
    groupPolicy?: 'open' | 'allowlist' | 'disabled';
    dmPolicy?: 'open' | 'disabled';
    defaultRecipient?: string;
}

export const defaultTelegramAgentChannelOptions: TelegramAgentChannelOptions = {
    baseUrl: 'https://api.telegram.org',
    dmPolicy: 'open',
    groupPolicy: 'disabled'
};

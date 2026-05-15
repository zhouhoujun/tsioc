export interface LineAgentChannelOptions {
    channelAccessToken?: string;
    channelSecret?: string;
    allowedUserIds?: string[];
    defaultRecipient?: string;
}

export const defaultLineAgentChannelOptions: LineAgentChannelOptions = {};

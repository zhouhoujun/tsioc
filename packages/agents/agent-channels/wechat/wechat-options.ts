export interface WechatAgentChannelOptions {
    appId?: string;
    appSecret?: string;
    token?: string;
    accountId?: string;
    baseUrl?: string;
    defaultRecipient?: string;
}

export const defaultWechatAgentChannelOptions: WechatAgentChannelOptions = {};

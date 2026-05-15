export interface FeishuAgentChannelOptions {
    appId?: string;
    appSecret?: string;
    domainName?: 'feishu' | 'lark';
    connectionMode?: 'websocket' | 'webhook';
    encryptKey?: string;
    verificationToken?: string;
    botName?: string;
    groupPolicy?: 'open' | 'allowlist' | 'blacklist' | 'admin_only' | 'disabled';
    requireMention?: boolean;
    defaultRecipient?: string;
}

export const defaultFeishuAgentChannelOptions: FeishuAgentChannelOptions = {
    domainName: 'feishu',
    connectionMode: 'websocket',
    groupPolicy: 'disabled',
    requireMention: true
};

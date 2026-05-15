export interface WecomAgentChannelOptions {
    botId?: string;
    secret?: string;
    websocketUrl?: string;
    dmPolicy?: 'open' | 'allowlist' | 'disabled' | 'pairing';
    groupPolicy?: 'open' | 'allowlist' | 'disabled';
    allowFrom?: string[];
    groupAllowFrom?: string[];
    defaultRecipient?: string;
}

export const defaultWecomAgentChannelOptions: WecomAgentChannelOptions = {
    websocketUrl: 'wss://openws.work.weixin.qq.com',
    dmPolicy: 'open',
    groupPolicy: 'disabled'
};

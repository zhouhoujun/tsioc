export interface QQAgentChannelOptions {
    appId?: string;
    botToken?: string;
    /** 机器人密钥，用于签名 */
    botSecret?: string;
    /** 是否使用 sandbox 环境 */
    sandbox?: boolean;
    allowedGroupIds?: string[];
    allowedUserIds?: string[];
    defaultRecipient?: string;
}

export const defaultQQAgentChannelOptions: QQAgentChannelOptions = {
    sandbox: false
};

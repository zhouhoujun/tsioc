export interface DingtalkAgentChannelOptions {
    clientId?: string;
    clientSecret?: string;
    robotCode?: string;
    requireMention?: boolean;
    mentionPatterns?: string[];
    freeResponseChats?: string[];
    allowedChats?: string[];
    allowedUsers?: string[];
    cardTemplateId?: string;
    defaultRecipient?: string;
}

export const defaultDingtalkAgentChannelOptions: DingtalkAgentChannelOptions = {
    requireMention: false
};

export type AgentConsoleAppCategory = 'code' | 'messaging';

export interface AgentConsoleAppDefinition {
    id: string;
    name: string;
    category: AgentConsoleAppCategory;
    description: string;
}

export interface AgentConsoleAppStatus extends AgentConsoleAppDefinition {
    authorized: boolean;
    statusLabel: string;
}

/** Host-owned authorization hook. The UI never handles provider secrets. */
export type AgentConsoleAppAuthorizer = (app: AgentConsoleAppDefinition) => Promise<boolean> | boolean;

// Messaging ids mirror the transports exposed by @tsdi/agent-channels.
export const agentConsoleApps: AgentConsoleAppDefinition[] = [
    { id: 'github', name: 'GitHub', category: 'code', description: 'Repositories, issues, pull requests, and actions' },
    { id: 'gitlab', name: 'GitLab', category: 'code', description: 'Projects, issues, merge requests, and pipelines' },
    { id: 'slack', name: 'Slack', category: 'messaging', description: 'Channels, threads, and messages' },
    { id: 'telegram', name: 'Telegram', category: 'messaging', description: 'Bots, chats, and messages' },
    { id: 'discord', name: 'Discord', category: 'messaging', description: 'Servers, channels, threads, and messages' },
    { id: 'line', name: 'LINE', category: 'messaging', description: 'Chats and messages' },
    { id: 'matrix', name: 'Matrix', category: 'messaging', description: 'Rooms, threads, and messages' },
    { id: 'mattermost', name: 'Mattermost', category: 'messaging', description: 'Teams, channels, and messages' },
    { id: 'signal', name: 'Signal', category: 'messaging', description: 'Private chats and messages' },
    { id: 'wechat', name: 'WeChat', category: 'messaging', description: 'Chats and messages' },
    { id: 'wecom', name: 'WeCom', category: 'messaging', description: 'Enterprise chats and messages' },
    { id: 'qq', name: 'QQ', category: 'messaging', description: 'Groups, chats, and messages' },
    { id: 'feishu', name: 'Feishu', category: 'messaging', description: 'Chats, documents, and messages' },
    { id: 'dingtalk', name: 'DingTalk', category: 'messaging', description: 'Organizations, chats, and messages' }
];

export function resolveAgentConsoleApps(config?: Record<string, boolean | { authorized?: boolean; enabled?: boolean }> | null): AgentConsoleAppStatus[] {
    const states = config || {};
    return agentConsoleApps.map(app => {
        const value = states[app.id];
        const authorized = value === true || (typeof value === 'object' && value !== null && value.authorized === true && value.enabled !== false);
        return { ...app, authorized, statusLabel: authorized ? 'connected' : 'authorization required' };
    });
}

export function extractAgentConsoleAppMentions(input: string): string[] {
    const known = new Set(agentConsoleApps.map(app => app.id));
    const matches = String(input || '').match(/(^|\s)\$([a-z][\w-]*)/gi) || [];
    return Array.from(new Set(matches
        .map(match => match.trim().slice(1).toLowerCase())
        .filter(id => known.has(id))));
}

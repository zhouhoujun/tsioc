import { AgentConsoleAppStatus, extractAgentConsoleAppMentions } from './AgentConsoleApps';

export interface PromptMentionHost {
    state: any;
    mentionCatalog?: any[];
    workspaceMentionsProvider?: { resolveContext(workspace: string, name: string, catalog?: any[]): Promise<any[]> } | null;
    resolveApps(): AgentConsoleAppStatus[];
}

export async function enrichPromptWithMentions(host: PromptMentionHost, input: string): Promise<string> {
    const text = String(input || '');
    const appMentions = extractAgentConsoleAppMentions(text);
    const matches = text.match(/(^|\s)@([^\s@]+)/g) || [];
    const mentions = Array.from(new Set(matches.map(item => item.trim())));
    if (!mentions.length && !appMentions.length) {
        return text;
    }
    const toolMap = new Map<string, any>((host.state.tools || []).map((tool: any) => [tool.name, tool] as [string, any]));
    const contextLines = (await Promise.all(mentions.map(async mention => {
        const name = mention.slice(1);
        switch (name) {
            case 'workspace':
                return [`Workspace: ${host.state.workspace}`];
            case 'session':
                return [`Session: ${host.state.sessionId}`];
            case 'model':
                return [`Model: ${host.state.provider} / ${host.state.model}`];
            case 'tools':
                return [`Tools: ${(host.state.tools || []).map((tool: any) => tool.name).join(', ') || '(none)'}`];
            default: {
                const tool = toolMap.get(name);
                if (tool) {
                    return [`Tool ${tool.name}: toolset=${tool.toolset || 'default'}, active=${tool.active === false ? 'no' : 'yes'}`];
                }
                return await host.workspaceMentionsProvider?.resolveContext(host.state.workspace, name, host.mentionCatalog) || [];
            }
        }
    }))).flat();
    const apps = host.resolveApps();
    const appContextLines = appMentions.map(id => {
        const app = apps.find(item => item.id === id)!;
        return `Connector ${app.name}: id=${app.id}, status=${app.statusLabel}, capabilities=${app.description}`;
    });
    if (!contextLines.length && !appContextLines.length) {
        return text;
    }
    return [
        '[Mention Context]',
        ...contextLines,
        ...appContextLines,
        '',
        text
    ].join('\n');
}

/** Declarative dialog routes: stable ids, categories and their command entry. */
export type AgentConsoleDialogGroup =
    | 'navigation' | 'model' | 'tools' | 'session' | 'extensions' | 'settings';

export interface AgentConsoleDialogRoute {
    id: string;
    path: string;
    group: AgentConsoleDialogGroup;
    title: string;
    command: string;
}

export const AGENT_CONSOLE_DIALOG_ROUTES: readonly AgentConsoleDialogRoute[] = [
    { id: 'help', path: '/help', group: 'navigation', title: 'Help', command: '/help' },
    { id: 'sessions', path: '/sessions', group: 'navigation', title: 'Sessions', command: '/sessions' },
    { id: 'projects', path: '/projects', group: 'navigation', title: 'Projects', command: '/projects' },
    { id: 'threads', path: '/threads', group: 'navigation', title: 'Threads', command: '/threads' },
    { id: 'model', path: '/model', group: 'model', title: 'Model', command: '/model' },
    { id: 'provider', path: '/provider', group: 'model', title: 'Provider', command: '/provider' },
    { id: 'permissions', path: '/permissions', group: 'model', title: 'Permissions', command: '/permissions' },
    { id: 'settings', path: '/settings', group: 'settings', title: 'Settings', command: '/settings' },
    { id: 'theme', path: '/theme', group: 'settings', title: 'Theme', command: '/theme' },
    { id: 'tools', path: '/tools', group: 'tools', title: 'Tools', command: '/tools' },
    { id: 'approvals', path: '/approvals', group: 'tools', title: 'Approvals', command: '/approvals' },
    { id: 'outputs', path: '/outputs', group: 'tools', title: 'Outputs', command: '/outputs' },
    { id: 'mcp', path: '/mcp', group: 'tools', title: 'MCP', command: '/mcp' },
    { id: 'skills', path: '/skills', group: 'extensions', title: 'Skills', command: '/skills' },
    { id: 'plugins', path: '/plugins', group: 'extensions', title: 'Plugins', command: '/plugins' },
    { id: 'apps', path: '/apps', group: 'extensions', title: 'Apps', command: '/apps' },
    { id: 'ssh', path: '/ssh', group: 'extensions', title: 'SSH', command: '/ssh' },
    { id: 'worktree', path: '/worktree', group: 'session', title: 'Worktrees', command: '/worktree' }
];

/** Resolve by id or path; a group name returns its first route. */
export function resolveAgentConsoleDialogRoute(query: string): AgentConsoleDialogRoute | undefined {
    const value = String(query || '').trim().toLowerCase();
    if (!value) {
        return undefined;
    }
    return AGENT_CONSOLE_DIALOG_ROUTES.find(route => route.id === value)
        ?? AGENT_CONSOLE_DIALOG_ROUTES.find(route => route.path === value)
        ?? AGENT_CONSOLE_DIALOG_ROUTES.find(route => route.group === value);
}

export function listAgentConsoleDialogRoutes(group?: string): AgentConsoleDialogRoute[] {
    const value = String(group || '').trim().toLowerCase();
    return value
        ? AGENT_CONSOLE_DIALOG_ROUTES.filter(route => route.group === value)
        : [...AGENT_CONSOLE_DIALOG_ROUTES];
}

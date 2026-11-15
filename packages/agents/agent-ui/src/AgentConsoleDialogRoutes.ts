/**
 * Declarative dialog routes: stable ids, categories and their command entry.
 *
 * A route is the single source of truth for "which command opens which dialog".
 * `/dialog <id|path|group>`, the web `?dialog=` deep link and the route catalogue
 * all read this table, so new dialogs only need one registration.
 */
export type AgentConsoleDialogGroup =
    | 'navigation' | 'model' | 'tools' | 'session' | 'extensions' | 'settings';

export type AgentConsoleDialogKind = 'select' | 'panel' | 'wizard' | 'text';

export interface AgentConsoleDialogRoute {
    id: string;
    path: string;
    group: AgentConsoleDialogGroup;
    /** Surface the route opens, for catalogues and pickers. */
    kind: AgentConsoleDialogKind;
    title: string;
    command: string;
    /** Extra deep-link names that resolve to this route. */
    aliases?: readonly string[];
}

export const AGENT_CONSOLE_DIALOG_GROUP_ORDER: readonly AgentConsoleDialogGroup[] = [
    'navigation', 'model', 'tools', 'session', 'extensions', 'settings'
];

export const AGENT_CONSOLE_DIALOG_ROUTES: readonly AgentConsoleDialogRoute[] = [
    { id: 'help', path: '/help', kind: 'select', group: 'navigation', title: 'Help', command: '/help' },
    { id: 'sessions', path: '/sessions', kind: 'panel', group: 'navigation', title: 'Sessions', command: '/sessions', aliases: ['session-list', 'resume'] },
    { id: 'projects', path: '/projects', kind: 'panel', group: 'navigation', title: 'Projects', command: '/projects' },
    { id: 'threads', path: '/threads', kind: 'panel', group: 'navigation', title: 'Threads', command: '/threads' },
    { id: 'model', path: '/model', kind: 'select', group: 'model', title: 'Model', command: '/model', aliases: ['models'] },
    { id: 'provider', path: '/provider', kind: 'wizard', group: 'model', title: 'Provider', command: '/provider', aliases: ['providers'] },
    { id: 'permissions', path: '/permissions', kind: 'select', group: 'model', title: 'Permissions', command: '/permissions', aliases: ['security'] },
    { id: 'settings', path: '/settings', kind: 'select', group: 'settings', title: 'Settings', command: '/settings' },
    { id: 'theme', path: '/theme', kind: 'select', group: 'settings', title: 'Theme', command: '/theme', aliases: ['themes'] },
    { id: 'tools', path: '/tools', kind: 'panel', group: 'tools', title: 'Tools', command: '/tools' },
    { id: 'approvals', path: '/approvals', kind: 'panel', group: 'tools', title: 'Approvals', command: '/approvals', aliases: ['approve', 'deny'] },
    { id: 'outputs', path: '/outputs', kind: 'panel', group: 'tools', title: 'Outputs', command: '/outputs' },
    { id: 'mcp', path: '/mcp', kind: 'select', group: 'tools', title: 'MCP', command: '/mcp' },
    { id: 'skills', path: '/skills', kind: 'select', group: 'extensions', title: 'Skills', command: '/skills' },
    { id: 'plugins', path: '/plugins', kind: 'select', group: 'extensions', title: 'Plugins', command: '/plugins' },
    { id: 'apps', path: '/apps', kind: 'select', group: 'extensions', title: 'Apps', command: '/apps' },
    { id: 'ssh', path: '/ssh', kind: 'text', group: 'extensions', title: 'SSH', command: '/ssh' },
    { id: 'rewind', path: '/rewind', kind: 'select', group: 'session', title: 'Rewind', command: '/rewind', aliases: ['checkpoints'] },
    { id: 'inbox', path: '/inbox', kind: 'select', group: 'session', title: 'Inbox', command: '/inbox', aliases: ['attention'] },
    { id: 'work', path: '/work', kind: 'select', group: 'session', title: 'Work', command: '/work', aliases: ['workers'] },
    { id: 'worktree', path: '/worktree', kind: 'text', group: 'session', title: 'Worktrees', command: '/worktree', aliases: ['worktrees'] }
];

export interface AgentConsoleDialogRouteGroup {
    group: AgentConsoleDialogGroup;
    routes: AgentConsoleDialogRoute[];
}

/** Resolve by id, path or alias; a group name returns its first route. */
export function resolveAgentConsoleDialogRoute(query: string): AgentConsoleDialogRoute | undefined {
    const value = String(query || '').trim().toLowerCase().replace(/^\/+/, '');
    if (!value) {
        return undefined;
    }
    const exact = AGENT_CONSOLE_DIALOG_ROUTES.find(route =>
        route.id === value
        || route.path === `/${value}`
        || (route.aliases || []).includes(value)
    );
    if (exact) {
        return exact;
    }
    const group = AGENT_CONSOLE_DIALOG_ROUTES.find(route => route.group === value);
    if (group) {
        return group;
    }
    // A unique prefix is a deep link too (`/dialog sess`, `/dialog prov`).
    const prefixed = AGENT_CONSOLE_DIALOG_ROUTES.filter(route => route.id.startsWith(value));
    return prefixed.length === 1 ? prefixed[0] : undefined;
}

export function listAgentConsoleDialogRoutes(group?: string): AgentConsoleDialogRoute[] {
    const value = String(group || '').trim().toLowerCase();
    return value
        ? AGENT_CONSOLE_DIALOG_ROUTES.filter(route => route.group === value)
        : [...AGENT_CONSOLE_DIALOG_ROUTES];
}

/** Routes bucketed for the catalogue dialog, in the declared group order. */
export function groupAgentConsoleDialogRoutes(group?: string): AgentConsoleDialogRouteGroup[] {
    const selected = listAgentConsoleDialogRoutes(group);
    return AGENT_CONSOLE_DIALOG_GROUP_ORDER.flatMap(name => {
        const routes = selected.filter(route => route.group === name);
        return routes.length ? [{ group: name, routes }] : [];
    });
}

/** Catalogue body shared by `/dialog` and `/help dialogs`. */
export function buildAgentConsoleDialogRouteLines(group?: string): string[] {
    return groupAgentConsoleDialogRoutes(group).flatMap(({ group: name, routes }) => [
        `[${name}]`,
        ...routes.map(route => `${route.id}  ${route.title}  ${route.path}  [${route.kind}]`)
    ]);
}

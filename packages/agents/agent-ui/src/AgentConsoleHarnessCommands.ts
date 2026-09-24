import type { BackgroundTaskRecord } from '@tsdi/agent-tools';
import { buildHarnessProjection, formatHarnessListLines, formatHarnessTreeLines, DelegationTreeNode, HarnessProjection } from '@tsdi/agent';
import { formatDelegationTree } from './AgentConsoleDelegationView';

/**
 * Host surface required by the harness / delegation tree commands.
 * The component satisfies this interface structurally when delegating.
 */
export interface HarnessCommandHost {
    sessionService: {
        getDelegationTree(sessionId: string, options?: { status?: string | string[]; depth?: number }, context?: any): Promise<Record<string, any> | null>;
        listAllBackgroundTasks(options: { sessionId?: string; delegationRoot?: string }, context?: any): Promise<Array<Record<string, any>>>;
    } | null;
    state: {
        sessionId: string;
        setHarnessState(projection: HarnessProjection | null): void;
    };
    notify(message: string): void;
    pushCommandOutput(command: string, text: string): void;
}

/**
 * Opens `/harness tree [sessionId]`: renders the delegation tree of the
 * resolved session overlaid with live background-task status via the
 * shared harness projection, and caches the projection on `harnessState`
 * so TUI and browser renderers draw from the same data.
 */
export async function openHarnessTreeView(host: HarnessCommandHost, sessionId?: string): Promise<boolean> {
    if (!host.sessionService) {
        host.notify('Harness projection is unavailable without app RPC.');
        return true;
    }
    const resolvedSessionId = (sessionId || '').trim() || host.state.sessionId;
    if (!resolvedSessionId) {
        host.notify('No session selected. Run /harness tree <sessionId>.');
        return true;
    }
    const tree = await host.sessionService.getDelegationTree(resolvedSessionId);
    if (!tree) {
        host.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
        return true;
    }
    const tasks = await host.sessionService.listAllBackgroundTasks({ delegationRoot: resolvedSessionId });
    const projection = buildHarnessProjection(tree as DelegationTreeNode, tasks as BackgroundTaskRecord[]);
    host.state.setHarnessState(projection);
    const lines = formatHarnessTreeLines(tree as DelegationTreeNode, projection);
    if (!lines.length) {
        host.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
        return true;
    }
    host.pushCommandOutput('/harness tree', lines.join(' | '));
    return true;
}

/**
 * Opens `/harness list [sessionId]`: renders a flat delegation digest with
 * per-session worker status and plan/step aggregate summary from the shared
 * harness projection, then caches it on `harnessState`.
 */
export async function openHarnessListView(host: HarnessCommandHost, sessionId?: string): Promise<boolean> {
    if (!host.sessionService) {
        host.notify('Harness projection is unavailable without app RPC.');
        return true;
    }
    const resolvedSessionId = (sessionId || '').trim() || host.state.sessionId;
    if (!resolvedSessionId) {
        host.notify('No session selected. Run /harness list <sessionId>.');
        return true;
    }
    const tree = await host.sessionService.getDelegationTree(resolvedSessionId);
    if (!tree) {
        host.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
        return true;
    }
    const tasks = await host.sessionService.listAllBackgroundTasks({ delegationRoot: resolvedSessionId });
    const projection = buildHarnessProjection(tree as DelegationTreeNode, tasks as BackgroundTaskRecord[]);
    host.state.setHarnessState(projection);
    const lines = formatHarnessListLines(projection);
    if (!lines.length) {
        host.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
        return true;
    }
    host.pushCommandOutput('/harness list', lines.join(' | '));
    return true;
}

/**
 * Opens `/delegation tree [sessionId] [status] [depth]`: renders the
 * persisted parent → child session tree rooted at the current (or given)
 * session as an indented tree with edge kind/status/timestamps inline.
 */
export async function openDelegationTreeView(host: HarnessCommandHost, sessionId?: string, status?: string, depth?: number): Promise<boolean> {
    if (!host.sessionService) {
        host.notify('Delegation graph is unavailable without app RPC.');
        return true;
    }
    const resolvedSessionId = (sessionId || '').trim() || host.state.sessionId;
    if (!resolvedSessionId) {
        host.notify('No session selected. Run /delegation tree <sessionId>.');
        return true;
    }
    const tree = await host.sessionService.getDelegationTree(resolvedSessionId, { status, depth });
    if (!tree) {
        host.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
        return true;
    }
    const lines = formatDelegationTree(tree);
    if (!lines.length) {
        host.notify(`No delegation edges recorded for session '${resolvedSessionId}'.`);
        return true;
    }
    host.pushCommandOutput('/delegation tree', lines.join(' | '));
    return true;
}
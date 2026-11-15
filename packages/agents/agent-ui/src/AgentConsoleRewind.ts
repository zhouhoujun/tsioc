import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import type { AgentConsoleSelectOption, AgentConsoleSessionState } from './AgentConsoleSessionState';

export interface AgentConsoleFileSnapshotView {
    filePath: string;
    timestamp?: number;
    toolName?: string;
    files?: string[];
}

export interface AgentConsoleRewindHost {
    translator?: AgentUiTranslator | null;
    state: AgentConsoleSessionState;
    appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
    runtime?: {
        listFileSnapshots?(sessionId: string): AgentConsoleFileSnapshotView[];
        undoFileChange?(sessionId: string): Promise<{ filePath?: string; restored?: string } | null>;
    } | null;
    notify(message: string): void;
    select?(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string): Promise<string | undefined>;
    rpcRequestContext?(): any;
}

async function listSnapshots(host: AgentConsoleRewindHost): Promise<AgentConsoleFileSnapshotView[]> {
    if (host.appRpc) {
        const result = await host.appRpc.request(
            'session.file_snapshot.list',
            { sessionId: host.state.sessionId },
            host.rpcRequestContext?.()
        ).catch(() => null);
        if (Array.isArray(result?.snapshots)) {
            return result.snapshots;
        }
    }
    return host.runtime?.listFileSnapshots?.(host.state.sessionId) ?? [];
}

async function undoOnce(host: AgentConsoleRewindHost): Promise<string> {
    if (host.appRpc) {
        const result = await host.appRpc.request(
            'session.undo_file',
            { sessionId: host.state.sessionId },
            host.rpcRequestContext?.()
        );
        return String(result?.filePath || '');
    }
    const result = await host.runtime?.undoFileChange?.(host.state.sessionId);
    return String(result?.filePath || '');
}

/**
 * `/rewind` — list captured file changes (newest first) and undo back to
 * before the selected change. Uses the existing FileSnapshotStore undo stack,
 * so `/redo` can still replay the reverted edits.
 */
export async function runRewindCommandView(host: AgentConsoleRewindHost): Promise<void> {
    const snapshots = await listSnapshots(host);
    if (!snapshots.length) {
        host.notify(formatAgentUiNotice(host.translator, 'rewindEmpty'));
        return;
    }
    const options: AgentConsoleSelectOption[] = snapshots.map((snapshot, index) => ({
        label: `${snapshot.filePath || '(unknown)'}`,
        value: String(snapshots.length - index),
        description: [snapshot.toolName, snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString() : '']
            .filter(Boolean).join(' · '),
        detail: (snapshot.files?.length || 1) > 1 ? `${snapshot.files?.length} files` : undefined
    }));
    const title = formatAgentUiNotice(host.translator, 'rewindTitle');
    const hint = formatAgentUiNotice(host.translator, 'rewindHint');
    const picked = host.select
        ? await host.select(title, options, options.length - 1, hint)
        : await host.state.selectAsync(title, options, options.length - 1, hint);
    const count = Math.max(0, Math.floor(Number(picked) || 0));
    if (!count) return;
    const restored: string[] = [];
    try {
        for (let index = 0; index < count; index += 1) {
            const filePath = await undoOnce(host);
            if (!filePath) break;
            restored.push(filePath);
        }
    } catch (error) {
        host.notify(formatAgentUiNotice(host.translator, 'rewindFailed', {
            error: error instanceof Error ? error.message : String(error)
        }));
        return;
    }
    host.notify(restored.length
        ? formatAgentUiNotice(host.translator, 'rewindRestored', { count: restored.length })
        : formatAgentUiNotice(host.translator, 'rewindEmpty'));
}

/** Command-context adapter for `/rewind`. */
export function rewindCommandHost(ctx: import('./AgentConsoleCommandHandlers').CommandHandlerContext): AgentConsoleRewindHost {
    return {
        translator: ctx.translator,
        state: ctx.state as any,
        appRpc: ctx.appRpc,
        runtime: ctx.runtime as any,
        notify: (message: string) => ctx.notify(message),
        select: (title, options, index, hint) => ctx.select(title, options, index, hint),
        rpcRequestContext: () => ctx.rpcRequestContext?.()
    };
}

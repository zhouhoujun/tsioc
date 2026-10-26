import { FileAdapter } from '@tsdi/common';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * `/cd` command.
 *
 * Extracted from `AgentConsoleComponent` (which is at its source-size ratchet)
 * so the new target validation does not grow the facade. The host interface is
 * exactly what the command needs: the current workspace, the state setter,
 * input-history persistence and a file adapter for validation.
 */
export interface AgentConsoleCdCommandHost {
    workspace: string;
    translator?: AgentUiTranslator | null;
    state: { setWorkspace(workspace: string): void };
    resolveFileAdapter(): FileAdapter | null;
    persistInputHistory(): Promise<void>;
    restoreInputHistory(): Promise<void>;
    notify(message: string): void;
}

/** Resolve an absolute or workspace-relative `/cd` target into a normalized path. */
export function resolveAgentConsoleCdTarget(current: string, target: string): string {
    const trimmed = String(target || '').trim();
    if (!trimmed) {
        return '';
    }
    let resolved: string;
    if (trimmed.startsWith('/') || /^[A-Z]:\\/i.test(trimmed)) {
        resolved = trimmed;
    } else if (current) {
        resolved = current.endsWith('/') ? current + trimmed : current + '/' + trimmed;
    } else {
        resolved = trimmed;
    }
    return resolved.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

/**
 * Switch the session workspace.
 *
 * A non-existent or non-directory target is rejected: `/cd` used to accept any
 * string, which pointed the whole session at a directory that does not exist
 * (file tools then failed or left the intended workspace root).
 */
export async function runCdCommandView(host: AgentConsoleCdCommandHost, args: string): Promise<void> {
    const target = String(args || '').trim();
    if (!target) {
        host.notify(host.workspace);
        return;
    }
    const resolved = resolveAgentConsoleCdTarget(host.workspace, target);
    const fileAdapter = host.resolveFileAdapter();
    if (fileAdapter) {
        const stats = await fileAdapter.stat(resolved).catch(() => null);
        if (!stats || typeof stats.isDirectory !== 'function' || !stats.isDirectory()) {
            host.notify(formatAgentUiNotice(host.translator, 'workspaceMissing', { path: resolved }));
            return;
        }
    }
    await host.persistInputHistory();
    host.state.setWorkspace(resolved);
    await host.restoreInputHistory();
    host.notify(formatAgentUiNotice(host.translator, 'workspaceArrow', { resolved: resolved }));
}

import type { FileAdapter } from '@tsdi/common';
import type { AgentOptions } from '../options';
import type { SessionStore } from '../memory/SessionStore';
import { findProjectRoot } from '../project/agents-doc';

export interface WorkspaceRootHost {
    options: AgentOptions;
    appArgs?: { cwd?: string };
    fileAdapter?: FileAdapter | null;
    sessions: SessionStore;
}

/** Workspace resolution (project root detection) and session workspace sync. */
export class WorkspaceRootController {
    constructor(private readonly host: WorkspaceRootHost) {
    }

    async ensureSessionWorkspace(sessionId: string): Promise<void> {
        const workspace = this.resolveWorkspace();
        if (!workspace) {
            return;
        }
        const state = await this.host.sessions.get(sessionId);
        if (state.workspace === workspace) {
            return;
        }
        await this.host.sessions.setWorkspace(sessionId, workspace);
    }

    async resolveSessionWorkspace(sessionId: string): Promise<string | undefined> {
        const state = await this.host.sessions.get(sessionId);
        return String(state.workspace || '').trim() || undefined;
    }

    resolveWorkspace(): string | undefined {
        const consoleOptions = this.host.options.ui?.console as Record<string, any> | undefined;
        const workspace = String(this.host.options.workspace || consoleOptions?.workspace || this.host.appArgs?.cwd || '').trim();
        if (!workspace) {
            return undefined;
        }
        const adapter = this.host.fileAdapter as (FileAdapter & { existsSync?: (path: string) => boolean }) | null | undefined;
        if (adapter && typeof adapter.existsSync === 'function' && adapter.existsSync(workspace)) {
            const root = findProjectRoot(workspace, {
                stopAtHome: false,
                exists: path => adapter.existsSync!(path)
            });
            if (root) {
                return root;
            }
        }
        return workspace;
    }
}

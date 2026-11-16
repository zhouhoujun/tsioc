import type { AgentConsoleSessionUiSnapshot } from './AgentConsoleSessionUiState';

/**
 * One per-session transcript pane record.
 *
 * The pane store is the ownership seam for per-session keep-alive: each session
 * gets a stable record that survives tab switches, carries its last UI snapshot
 * and a monotonic version. A cached frame/layout is valid for that version, so
 * revisiting an unchanged tab can reuse it instead of rebuilding the transcript.
 */
export interface AgentConsoleSessionPane {
    id: string;
    snapshot?: AgentConsoleSessionUiSnapshot;
    /** Bumped whenever the pane's captured state changes. */
    version: number;
}

/** Per-session pane records for the open session tabs. */
export class AgentConsoleSessionPaneStore {
    protected readonly panes = new Map<string, AgentConsoleSessionPane>();
    protected activeSessionId = '';

    ensure(sessionId?: string): AgentConsoleSessionPane | undefined {
        const id = String(sessionId || '').trim();
        if (!id) {
            return undefined;
        }
        let pane = this.panes.get(id);
        if (!pane) {
            pane = { id, version: 0 };
            this.panes.set(id, pane);
        }
        return pane;
    }

    get(sessionId?: string): AgentConsoleSessionPane | undefined {
        const id = String(sessionId || '').trim();
        return id ? this.panes.get(id) : undefined;
    }

    list(): AgentConsoleSessionPane[] {
        return Array.from(this.panes.values());
    }

    get activeId(): string {
        return this.activeSessionId;
    }

    get active(): AgentConsoleSessionPane | undefined {
        return this.panes.get(this.activeSessionId);
    }

    /** Mark one session as the visible pane. */
    activate(sessionId?: string): AgentConsoleSessionPane | undefined {
        const pane = this.ensure(sessionId);
        if (pane) {
            this.activeSessionId = pane.id;
        }
        return pane;
    }

    snapshot(sessionId?: string): AgentConsoleSessionUiSnapshot | undefined {
        return this.get(sessionId)?.snapshot;
    }

    /** Store a captured snapshot and invalidate the pane's cached frame. */
    putSnapshot(sessionId: string, snapshot: AgentConsoleSessionUiSnapshot): AgentConsoleSessionPane | undefined {
        const pane = this.ensure(sessionId);
        if (!pane) {
            return undefined;
        }
        pane.snapshot = snapshot;
        pane.version += 1;
        return pane;
    }

    bump(sessionId?: string): number {
        const pane = this.ensure(sessionId);
        if (!pane) {
            return 0;
        }
        pane.version += 1;
        return pane.version;
    }

    forget(sessionId?: string): void {
        const id = String(sessionId || '').trim();
        if (!id) {
            return;
        }
        this.panes.delete(id);
        if (this.activeSessionId === id) {
            this.activeSessionId = '';
        }
    }

    clear(): void {
        this.panes.clear();
        this.activeSessionId = '';
    }
}

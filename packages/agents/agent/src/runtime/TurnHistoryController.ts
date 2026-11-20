import type { FileSnapshotStore } from '../harness/FileSnapshotStore';
import type { SessionStore } from '../memory/SessionStore';
import type { SessionTurnCheckpoints, SessionTurnUndoResult } from './SessionTurnCheckpoints';
import type { TurnHistoryStore } from './TurnHistoryStore';

export interface TurnHistoryHost {
    sessions: SessionStore;
    checkpoints: SessionTurnCheckpoints;
    fileSnapshots?: FileSnapshotStore;
    undoFile(sessionId: string): Promise<unknown>;
    redoFile(sessionId: string): Promise<unknown>;
}

/**
 * Turn/file undo orchestration with optional persistence.
 *
 * Keeps `DefaultAgentRuntime` small: hydration is lazy per session, writes are
 * serialized per session, and a missing/failing store never blocks a turn or
 * an undo (the in-memory stacks remain authoritative for the process).
 */
export class TurnHistoryController {
    private ready = new Set<string>();
    private unavailable = new Set<string>();
    private writes = new Map<string, Promise<void>>();
    /** Sessions inside a turn-level undo/redo: per-file writes are deferred. */
    private batch = new Set<string>();

    constructor(private store: TurnHistoryStore | undefined, private host: TurnHistoryHost) {
    }

    async record(sessionId: string, prompt: string): Promise<void> {
        const state = await this.host.sessions.get(sessionId);
        await this.ensure(sessionId);
        this.host.checkpoints.record(sessionId, {
            messageCount: state.messages.length,
            fileCount: this.host.fileSnapshots?.list(sessionId).length ?? 0,
            prompt: String(prompt || ''),
            createdAt: Date.now()
        });
        await this.persist(sessionId);
    }

    async undo(sessionId: string): Promise<SessionTurnUndoResult> {
        await this.ensure(sessionId);
        this.batch.add(sessionId);
        try {
            const result = await this.host.checkpoints.undo(
                sessionId,
                this.host.sessions,
                this.host.fileSnapshots,
                id => this.host.undoFile(id)
            );
            await this.persist(sessionId);
            return result;
        } finally {
            this.batch.delete(sessionId);
        }
    }

    async redo(sessionId: string): Promise<SessionTurnUndoResult> {
        await this.ensure(sessionId);
        this.batch.add(sessionId);
        try {
            const result = await this.host.checkpoints.redo(
                sessionId,
                this.host.sessions,
                id => this.host.redoFile(id)
            );
            await this.persist(sessionId);
            return result;
        } finally {
            this.batch.delete(sessionId);
        }
    }

    /** Called after a direct (non-turn) file undo/redo so the stack persists. */
    async afterFileChange(sessionId: string): Promise<void> {
        if (this.batch.has(sessionId)) {
            return;
        }
        await this.persist(sessionId);
    }

    private async ensure(sessionId: string): Promise<void> {
        if (!this.store || this.ready.has(sessionId) || this.unavailable.has(sessionId)) {
            return;
        }
        try {
            const record = await this.store.load(sessionId);
            if (record) {
                this.host.checkpoints.restore(sessionId, { undo: record.turnUndo, redo: record.turnRedo });
                this.host.fileSnapshots?.restore(sessionId, { undo: record.fileUndo, redo: record.fileRedo });
            }
            this.ready.add(sessionId);
        } catch {
            this.unavailable.add(sessionId);
        }
    }

    private async persist(sessionId: string): Promise<void> {
        if (!this.store) {
            return;
        }
        if (!this.ready.has(sessionId)) {
            await this.ensure(sessionId);
            if (!this.ready.has(sessionId)) {
                return;
            }
        }
        const turn = this.host.checkpoints.snapshot(sessionId);
        const files = this.host.fileSnapshots?.snapshot(sessionId) ?? { undo: [], redo: [] };
        const record = {
            turnUndo: turn.undo,
            turnRedo: turn.redo,
            fileUndo: files.undo,
            fileRedo: files.redo
        };
        const previous = this.writes.get(sessionId) ?? Promise.resolve();
        const next = previous.catch(() => undefined).then(async () => {
            try {
                await this.store!.save(sessionId, record);
            } catch {
                // Best-effort persistence; in-memory history stays usable.
            }
        });
        this.writes.set(sessionId, next);
        await next;
        if (this.writes.get(sessionId) === next) {
            this.writes.delete(sessionId);
        }
    }
}

import type { FileSnapshot } from '../harness/FileSnapshotStore';
import type { SessionTurnCheckpoint, SessionTurnRedoEntry } from './SessionTurnCheckpoints';

/** Persisted turn/file undo history for one session. */
export interface TurnHistoryRecord {
    turnUndo: SessionTurnCheckpoint[];
    turnRedo: SessionTurnRedoEntry[];
    fileUndo: FileSnapshot[];
    fileRedo: FileSnapshot[];
}

/**
 * Optional persistence for turn undo/redo. Runtimes without a store keep the
 * historical in-memory behaviour; `DefaultAgentRuntime` hydrates lazily so
 * `/undo` works after a restart without loading every session up front.
 */
export abstract class TurnHistoryStore {
    abstract load(sessionId: string): Promise<TurnHistoryRecord | null>;
    abstract save(sessionId: string, record: TurnHistoryRecord): Promise<void>;
    abstract delete(sessionId: string): Promise<void>;
}

import type { AgentMessage } from './AgentMessage';
import type { SessionStore } from '../memory/SessionStore';
import type { FileSnapshotStore } from '../harness/FileSnapshotStore';

export interface SessionTurnCheckpoint {
    /** Messages that existed before the prompt was appended. */
    messageCount: number;
    /** File undo depth before the turn; later entries belong to this turn. */
    fileCount: number;
    /** The user prompt, returned so the composer can offer it for editing. */
    prompt: string;
    createdAt: number;
}

export interface SessionTurnUndoResult {
    restored: boolean;
    prompt?: string;
    files?: number;
}

interface SessionTurnRedoEntry {
    checkpoint: SessionTurnCheckpoint;
    messages: AgentMessage[];
    files: number;
}

const MAX_DEPTH = 20;

/**
 * Turn-level undo/redo: opencode's `/undo` reverts the latest user prompt and
 * everything the turn produced (assistant text, tools, file changes), then
 * returns the prompt to the composer. This class keeps the in-memory turn
 * boundaries and replays the conversation through the session store.
 *
 * Sending a new prompt clears the redo branch, matching "accept the revert".
 */
export class SessionTurnCheckpoints {
    private undoStacks = new Map<string, SessionTurnCheckpoint[]>();
    private redoStacks = new Map<string, SessionTurnRedoEntry[]>();

    record(sessionId: string, checkpoint: SessionTurnCheckpoint): void {
        const stack = this.undoStacks.get(sessionId) ?? [];
        stack.push(checkpoint);
        if (stack.length > MAX_DEPTH) {
            stack.splice(0, stack.length - MAX_DEPTH);
        }
        this.undoStacks.set(sessionId, stack);
        this.redoStacks.delete(sessionId);
    }

    async undo(
        sessionId: string,
        sessions: SessionStore,
        fileSnapshots: FileSnapshotStore | undefined,
        undoFile: (sessionId: string) => Promise<unknown>
    ): Promise<SessionTurnUndoResult> {
        const stack = this.undoStacks.get(sessionId);
        const checkpoint = stack?.[stack.length - 1];
        if (!checkpoint) {
            return { restored: false };
        }
        const state = await sessions.get(sessionId);
        const removed = state.messages.slice(checkpoint.messageCount);
        const files = Math.max(0, (fileSnapshots?.list(sessionId).length ?? 0) - checkpoint.fileCount);
        // Conversation first: a store without truncate support must fail before
        // any file is reverted, so the caller can fall back to file undo.
        await sessions.truncateMessages(sessionId, checkpoint.messageCount);
        for (let index = 0; index < files; index++) {
            await undoFile(sessionId);
        }
        stack.pop();
        if (!stack.length) {
            this.undoStacks.delete(sessionId);
        }
        const redoStack = this.redoStacks.get(sessionId) ?? [];
        redoStack.push({ checkpoint, messages: removed, files });
        if (redoStack.length > MAX_DEPTH) {
            redoStack.splice(0, redoStack.length - MAX_DEPTH);
        }
        this.redoStacks.set(sessionId, redoStack);
        return { restored: true, prompt: checkpoint.prompt, files };
    }

    async redo(
        sessionId: string,
        sessions: SessionStore,
        redoFile: (sessionId: string) => Promise<unknown>
    ): Promise<SessionTurnUndoResult> {
        const redoStack = this.redoStacks.get(sessionId);
        const entry = redoStack?.[redoStack.length - 1];
        if (!entry) {
            return { restored: false };
        }
        const base = (await sessions.get(sessionId)).messages.length;
        for (const message of entry.messages) {
            await sessions.appendRaw(sessionId, message);
        }
        for (let index = 0; index < entry.files; index++) {
            await redoFile(sessionId);
        }
        redoStack.pop();
        if (!redoStack.length) {
            this.redoStacks.delete(sessionId);
        }
        const stack = this.undoStacks.get(sessionId) ?? [];
        stack.push({ ...entry.checkpoint, messageCount: base });
        if (stack.length > MAX_DEPTH) {
            stack.splice(0, stack.length - MAX_DEPTH);
        }
        this.undoStacks.set(sessionId, stack);
        return { restored: true, prompt: entry.checkpoint.prompt, files: entry.files };
    }
}

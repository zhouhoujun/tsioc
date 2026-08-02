/**
 * A file change snapshot for undo/redo. `before` is the file content prior to
 * the change (null when the file did not exist), `after` is the content after
 * the change (null when the file was deleted).
 */
export interface FileSnapshot {
    filePath: string;
    before: string | null;
    after: string | null;
    timestamp: number;
    toolName?: string;
    toolCallId?: string;
}

export const DEFAULT_FILE_SNAPSHOT_MAX_DEPTH = 50;
export const DEFAULT_FILE_SNAPSHOT_MAX_TOTAL_BYTES = 5 * 1024 * 1024;

/**
 * Per-session undo/redo stacks for file changes. `push` records a change on
 * the undo stack (dropping the redo branch), `undo` moves the latest change to
 * the redo stack, `redo` moves it back. Depth and total byte limits are
 * enforced by evicting the oldest snapshots.
 */
export class FileSnapshotStore {
    private undoStacks = new Map<string, FileSnapshot[]>();
    private redoStacks = new Map<string, FileSnapshot[]>();

    constructor(
        private maxDepth = DEFAULT_FILE_SNAPSHOT_MAX_DEPTH,
        private maxTotalBytes = DEFAULT_FILE_SNAPSHOT_MAX_TOTAL_BYTES
    ) {
    }

    push(sessionId: string, snapshot: FileSnapshot): void {
        const stack = this.undoStacks.get(sessionId) ?? [];
        stack.push(snapshot);
        this.redoStacks.delete(sessionId);
        this.enforceLimits(stack);
        this.undoStacks.set(sessionId, stack);
    }

    undo(sessionId: string): FileSnapshot | null {
        const stack = this.undoStacks.get(sessionId);
        if (!stack) {
            return null;
        }
        const snapshot = stack.pop();
        if (!snapshot) {
            return null;
        }
        if (stack.length) {
            this.undoStacks.set(sessionId, stack);
        } else {
            this.undoStacks.delete(sessionId);
        }
        const redo = this.redoStacks.get(sessionId) ?? [];
        redo.push(snapshot);
        this.redoStacks.set(sessionId, redo);
        return snapshot;
    }

    redo(sessionId: string): FileSnapshot | null {
        const redo = this.redoStacks.get(sessionId);
        if (!redo) {
            return null;
        }
        const snapshot = redo.pop();
        if (!snapshot) {
            return null;
        }
        if (redo.length) {
            this.redoStacks.set(sessionId, redo);
        } else {
            this.redoStacks.delete(sessionId);
        }
        const stack = this.undoStacks.get(sessionId) ?? [];
        stack.push(snapshot);
        this.undoStacks.set(sessionId, stack);
        return snapshot;
    }

    list(sessionId: string): FileSnapshot[] {
        return [...(this.undoStacks.get(sessionId) ?? [])];
    }

    listRedo(sessionId: string): FileSnapshot[] {
        return [...(this.redoStacks.get(sessionId) ?? [])];
    }

    clear(sessionId: string): void {
        this.undoStacks.delete(sessionId);
        this.redoStacks.delete(sessionId);
    }

    private enforceLimits(stack: FileSnapshot[]): void {
        while (stack.length > this.maxDepth) {
            stack.shift();
        }
        let total = stack.reduce((sum, snapshot) => sum + this.sizeOf(snapshot), 0);
        while (stack.length && total > this.maxTotalBytes) {
            const dropped = stack.shift();
            if (dropped) {
                total -= this.sizeOf(dropped);
            }
        }
    }

    private sizeOf(snapshot: FileSnapshot): number {
        return (snapshot.before?.length ?? 0) + (snapshot.after?.length ?? 0);
    }
}

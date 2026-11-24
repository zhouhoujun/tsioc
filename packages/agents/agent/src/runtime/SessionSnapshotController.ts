import type { FileAdapter } from '@tsdi/common';
import type { FileSnapshot, FileSnapshotPart, FileSnapshotStore } from '../harness/FileSnapshotStore';
import type { GitRevertResult, GitStepDiff, GitStepSnapshot, GitStepSnapshotStore } from '../harness/GitStepSnapshotStore';
import type { FileUndoRedoResult } from './AgentRuntime';
import { dirnameAgentPath } from '../AgentWorkspacePath';

export interface SessionSnapshotHost {
    fileAdapter?: FileAdapter;
    fileSnapshots?: FileSnapshotStore;
    gitSnapshots?: GitStepSnapshotStore;
    afterFileChange(sessionId: string): Promise<void>;
}

/** File undo/redo, content snapshots and git step snapshots. */
export class SessionSnapshotController {
    private pendingGit = new Map<string, string>();

    constructor(private readonly host: SessionSnapshotHost) {
    }

    async undoFile(sessionId: string): Promise<FileUndoRedoResult> {
        const snapshot = this.host.fileSnapshots?.undo(sessionId);
        if (!snapshot) return { filePath: '', restored: 'none' };
        await this.restore(snapshot, 'before');
        await this.host.afterFileChange(sessionId);
        return { filePath: snapshot.filePath, restored: snapshot.before === null ? 'deleted' : 'content', snapshot };
    }

    async redoFile(sessionId: string): Promise<FileUndoRedoResult> {
        const snapshot = this.host.fileSnapshots?.redo(sessionId);
        if (!snapshot) return { filePath: '', restored: 'none' };
        await this.restore(snapshot, 'after');
        await this.host.afterFileChange(sessionId);
        return { filePath: snapshot.filePath, restored: snapshot.after === null ? 'deleted' : 'content', snapshot };
    }

    listFiles(sessionId: string): FileSnapshot[] {
        return this.host.fileSnapshots?.list(sessionId) ?? [];
    }

    async captureGit(sessionId: string, workspace: string, messageId: string): Promise<GitStepSnapshot | null> {
        const store = this.host.gitSnapshots;
        if (!store) return null;
        const snapshot = await store.capture(workspace, { sessionId, messageId, label: `step-${sessionId}` });
        if (snapshot) this.bindGit(sessionId, messageId);
        return snapshot;
    }

    async revertGit(sessionId: string, messageId: string): Promise<GitRevertResult> {
        return await this.host.gitSnapshots?.revert(messageId, sessionId)
            ?? { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    async unrevertGit(sessionId: string): Promise<GitRevertResult> {
        return await this.host.gitSnapshots?.unrevert(sessionId)
            ?? { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    listGit(sessionId: string): GitStepSnapshot[] {
        return this.host.gitSnapshots?.list(sessionId) ?? [];
    }

    async diffGit(ref: string): Promise<GitStepDiff | null> {
        const store = this.host.gitSnapshots;
        if (!store) return null;
        const snapshot = store.resolveByMessage(ref) ?? store.get(ref);
        return snapshot ? store.diff(snapshot) : null;
    }

    async beginGit(sessionId: string, workspace?: string): Promise<void> {
        if (!this.host.gitSnapshots || !workspace) return;
        try {
            const snapshot = await this.host.gitSnapshots.capture(workspace, { sessionId, label: `turn-${sessionId}` });
            if (snapshot) this.pendingGit.set(sessionId, snapshot.id);
        } catch {
            // a snapshot failure must not break a turn
        }
    }

    bindGit(sessionId: string, messageId: string): void {
        const pendingId = this.pendingGit.get(sessionId);
        this.pendingGit.delete(sessionId);
        if (!pendingId || !this.host.gitSnapshots) return;
        try {
            this.host.gitSnapshots.bind(pendingId, messageId);
        } catch {
            // binding failure leaves an unbound snapshot, diff still works by id
        }
    }

    async pushFile(sessionId: string, snapshot: FileSnapshot | null): Promise<void> {
        if (!snapshot || !this.host.fileSnapshots) return;
        try {
            const resolved = await this.resolveAfter(snapshot);
            this.host.fileSnapshots.push(sessionId, resolved);
            await this.host.afterFileChange(sessionId);
        } catch {
            // a snapshot failure must not break a successful tool call
        }
    }

    async readText(filePath: string): Promise<string | null> {
        if (!this.host.fileAdapter) return null;
        try {
            return await this.host.fileAdapter.readText(filePath);
        } catch {
            return null;
        }
    }

    private async resolveAfter(snapshot: FileSnapshot): Promise<FileSnapshot> {
        const content = await this.readText(snapshot.filePath);
        let files: FileSnapshotPart[] | undefined;
        if (snapshot.files?.length) {
            files = [];
            for (const part of snapshot.files) {
                files.push({ ...part, after: await this.readText(part.filePath) });
            }
        }
        return { ...snapshot, after: content, files };
    }

    private async restore(snapshot: FileSnapshot, which: 'before' | 'after'): Promise<void> {
        if (!this.host.fileAdapter) return;
        if (snapshot.files?.length) {
            for (const part of [...snapshot.files].reverse()) await this.restorePart(part, which);
            return;
        }
        await this.restorePart(snapshot, which);
    }

    private async restorePart(part: FileSnapshotPart, which: 'before' | 'after'): Promise<void> {
        const content = which === 'before' ? part.before : (part.after ?? null);
        if (content === null) {
            await this.host.fileAdapter!.remove(part.filePath, { force: true }).catch(() => undefined);
            return;
        }
        await this.host.fileAdapter!.mkdir(dirnameAgentPath(part.filePath), { recursive: true });
        await this.host.fileAdapter!.writeText(part.filePath, content);
    }
}

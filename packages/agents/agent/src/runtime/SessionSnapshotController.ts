import type { FileAdapter } from '@tsdi/common';
import type { FileSnapshot, FileSnapshotPart, FileSnapshotStore } from '../harness/FileSnapshotStore';
import type { GitRevertResult, GitStepDiff, GitStepSnapshot, GitStepSnapshotStore } from '../harness/GitStepSnapshotStore';
import type { ContentAddressedSnapshotStore } from '../harness/ContentAddressedSnapshotStore';
import type { FileUndoRedoResult } from './AgentRuntime';
import { dirnameAgentPath } from '../AgentWorkspacePath';

export interface SessionSnapshotHost {
    fileAdapter?: FileAdapter;
    fileSnapshots?: FileSnapshotStore;
    gitSnapshots?: GitStepSnapshotStore;
    contentSnapshots?: ContentAddressedSnapshotStore;
    workspace(sessionId: string): Promise<string | undefined>;
    afterFileChange(sessionId: string): Promise<void>;
}

/** File undo/redo, content snapshots and git step snapshots. */
export class SessionSnapshotController {
    private pendingGit = new Map<string, string>();
    private stagedReverts = new Map<string, { messageId: string; files: string[]; paths?: string[] }>();

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
        if (snapshot) await this.bindGit(sessionId, messageId, workspace);
        return snapshot;
    }

    async revertGit(sessionId: string, messageId: string): Promise<GitRevertResult> {
        const git = await this.host.gitSnapshots?.revert(messageId, sessionId).catch(() => null);
        if (git?.reverted) return git;
        const workspace = await this.host.workspace(sessionId);
        const content = workspace && this.host.contentSnapshots
            ? await this.host.contentSnapshots.restore(sessionId, workspace, messageId, 'before')
            : null;
        if (content?.restored) {
            return { reverted: true, messageId, restoredFiles: content.files };
        }
        return git ?? { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    async unrevertGit(sessionId: string): Promise<GitRevertResult> {
        const git = await this.host.gitSnapshots?.unrevert(sessionId).catch(() => null);
        if (git?.reverted) return git;
        const workspace = await this.host.workspace(sessionId);
        const id = this.host.contentSnapshots?.lastRevertedId(sessionId);
        const content = workspace && this.host.contentSnapshots && id
            ? await this.host.contentSnapshots.restore(sessionId, workspace, id, 'after')
            : null;
        if (content?.restored) {
            return { reverted: true, messageId: content.messageId, restoredFiles: content.files };
        }
        return git ?? { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    /** P1.2: preview the files a message-level revert would restore without applying it. */
    async stageRevert(sessionId: string, messageId: string, paths?: string[]): Promise<{ messageId: string; files: string[]; restoreOrder: 'reverse' }> {
        const workspace = await this.host.workspace(sessionId);
        const manifests = workspace && this.host.contentSnapshots ? await this.host.contentSnapshots.list(sessionId, workspace) : [];
        const manifest = manifests.find(item => item.id === messageId || item.messageId === messageId);
        const diff = manifest ? null : await this.diffGit(sessionId, messageId);
        const selected = paths?.length ? new Set(paths.map(path => path.replace(/\\/g, '/'))) : undefined;
        const all = manifest ? manifest.files.map(file => file.path) : (diff?.files ?? []).map(file => file.filePath);
        const files = selected ? all.filter(path => selected.has(path)) : all;
        const staged = { messageId, files, restoreOrder: 'reverse' as const };
        this.stagedReverts.set(sessionId, { messageId, files, ...(selected ? { paths: Array.from(selected) } : {}) });
        return staged;
    }

    clearStagedRevert(sessionId: string): boolean {
        return this.stagedReverts.delete(sessionId);
    }

    async commitStagedRevert(sessionId: string): Promise<GitRevertResult> {
        const staged = this.stagedReverts.get(sessionId);
        if (!staged) {
            return { reverted: false, error: 'no staged revert' };
        }
        this.stagedReverts.delete(sessionId);
        if (staged.paths?.length && this.host.contentSnapshots) {
            const workspace = await this.host.workspace(sessionId);
            if (workspace) {
                const content = await this.host.contentSnapshots.restore(sessionId, workspace, staged.messageId, 'before', staged.paths);
                if (content.restored) {
                    return { reverted: true, messageId: staged.messageId, restoredFiles: content.files };
                }
            }
        }
        return this.revertGit(sessionId, staged.messageId);
    }

    async listGit(sessionId: string): Promise<GitStepSnapshot[]> {
        const git = this.host.gitSnapshots?.list(sessionId) ?? [];
        const workspace = await this.host.workspace(sessionId);
        const manifests = await this.host.contentSnapshots?.list(sessionId, workspace) ?? [];
        const known = new Set(git.map(item => item.messageId).filter(Boolean));
        const content = manifests
            .filter(item => !item.messageId || !known.has(item.messageId))
            .map(item => ({
                id: item.id,
                sessionId,
                ...(item.messageId ? { messageId: item.messageId } : {}),
                workspace: item.workspace,
                commit: '',
                label: `snapshot-${item.id}`,
                timestamp: item.createdAt
            } as GitStepSnapshot));
        return [...git, ...content];
    }

    async diffGit(sessionId: string, ref: string): Promise<GitStepDiff | null> {
        const store = this.host.gitSnapshots;
        if (store) {
            const snapshot = store.resolveByMessage(ref) ?? store.get(ref);
            if (snapshot) return await store.diff(snapshot);
        }
        const workspace = await this.host.workspace(sessionId);
        if (!workspace || !this.host.contentSnapshots) return null;
        const manifests = await this.host.contentSnapshots.list(sessionId, workspace);
        const target = manifests.find(item => item.id === ref || item.messageId === ref);
        if (!target) return null;
        const diff = await this.host.contentSnapshots.diff(sessionId, workspace, target.id);
        if (!diff) return null;
        return {
            ...(diff.messageId ? { messageId: diff.messageId } : {}),
            snapshotId: diff.snapshotId,
            commit: '',
            workspace: diff.workspace,
            files: diff.files.map(file => ({ filePath: file.filePath, status: file.status, additions: 0, deletions: 0 })),
            totalAdditions: diff.totalAdditions,
            totalDeletions: diff.totalDeletions,
            rawPatch: ''
        };
    }

    async beginGit(sessionId: string, workspace?: string): Promise<void> {
        this.host.contentSnapshots?.begin(sessionId);
        if (!this.host.gitSnapshots || !workspace) return;
        try {
            const snapshot = await this.host.gitSnapshots.capture(workspace, { sessionId, label: `turn-${sessionId}` });
            if (snapshot) this.pendingGit.set(sessionId, snapshot.id);
        } catch {
            // a snapshot failure must not break a turn
        }
    }

    async bindGit(sessionId: string, messageId: string, workspace?: string): Promise<void> {
        const pendingId = this.pendingGit.get(sessionId);
        this.pendingGit.delete(sessionId);
        if (pendingId && this.host.gitSnapshots) {
            try {
                this.host.gitSnapshots.bind(pendingId, messageId);
            } catch {
                // binding failure leaves an unbound snapshot, diff still works by id
            }
        }
        const root = workspace ?? await this.host.workspace(sessionId);
        if (root) {
            await this.host.contentSnapshots?.commit(sessionId, root, messageId).catch(() => null);
        }
    }

    async pushFile(sessionId: string, snapshot: FileSnapshot | null): Promise<void> {
        if (!snapshot) return;
        try {
            const resolved = await this.resolveAfter(snapshot);
            this.host.fileSnapshots?.push(sessionId, resolved);
            this.host.contentSnapshots?.record(sessionId, resolved.files?.length
                ? resolved.files.map(part => ({ filePath: part.filePath, before: part.before, after: part.after ?? null }))
                : [{ filePath: resolved.filePath, before: resolved.before, after: resolved.after }]);
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

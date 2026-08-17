import { spawnSync } from 'child_process';

/**
 * A working-tree snapshot taken at agent step start via `git stash create`.
 * The snapshot commit is dangling (never touches branch history); the store
 * pins it with `refs/agents/step/<id>` so it survives garbage collection.
 */
export interface GitStepSnapshotDiffStats {
    filesChanged: number;
    totalAdditions: number;
    totalDeletions: number;
}

export interface GitStepSnapshot {
    id: string;
    /** session the snapshot was captured for (when captured by the runtime) */
    sessionId?: string;
    /** session message id the snapshot is bound to (step's assistant message) */
    messageId?: string;
    /** git repository root the snapshot was captured in */
    workspace: string;
    /** dangling commit hash produced by `git stash create` */
    commit: string;
    label?: string;
    timestamp: number;
    /** summary diff stats captured at snapshot time (files changed, +/-) */
    diffStats?: GitStepSnapshotDiffStats;
}

/** One changed file between a step snapshot and the current working tree. */
export interface GitStepDiffFile {
    filePath: string;
    status: 'added' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
    patch?: string;
}

/** The complete diff between a step snapshot and the current working tree. */
export interface GitStepDiff {
    snapshotId?: string;
    messageId?: string;
    commit: string;
    workspace: string;
    files: GitStepDiffFile[];
    totalAdditions: number;
    totalDeletions: number;
    rawPatch: string;
}

/** A recorded revert; `unrevert` restores the pre-revert working tree. */
export interface GitRevertRecord {
    sessionId: string;
    snapshotId: string;
    messageId?: string;
    /** dangling commit of the working tree captured right before the revert */
    fromCommit: string;
    revertedAt: number;
}

export interface GitRevertResult {
    reverted: boolean;
    snapshotId?: string;
    messageId?: string;
    commit?: string;
    restoredFiles?: number;
    error?: string;
}

export interface GitStepSnapshotOptions {
    /** git command timeout in ms (default 10000) */
    timeoutMs?: number;
    /** remove untracked files created after the snapshot during revert (default true) */
    cleanUntracked?: boolean;
}

const GIT_SNAPSHOT_REF_PREFIX = 'refs/agents/step/';

/**
 * P71: git-backed step snapshots with message-level revert/unrevert.
 *
 * Captures the working tree as a dangling commit at step start (bound to the
 * step's assistant message id), then restores the whole tree on `revert`.
 * Coexists with the content-level `FileSnapshotStore`: git snapshots restore
 * the full tree, file snapshots provide precise per-file undo.
 */
export class GitStepSnapshotStore {
    private snapshots = new Map<string, GitStepSnapshot>();
    private byMessage = new Map<string, string>();
    private revertStacks = new Map<string, GitRevertRecord[]>();

    constructor(private options: GitStepSnapshotOptions = {}) {
    }

    /** True when the workspace is inside a git work tree. */
    isAvailable(workspace: string): boolean {
        if (!workspace) {
            return false;
        }
        const result = this.runGit(workspace, ['rev-parse', '--is-inside-work-tree']);
        return result.exitCode === 0 && result.stdout.trim() === 'true';
    }

    /**
     * Capture the current working tree as a step snapshot. Returns null when
     * the workspace is not a git repo or has no tracked changes (untracked
     * files alone are not captured). Never modifies the working tree or the
     * branch history.
     */
    capture(workspace: string, opts?: { sessionId?: string; messageId?: string; label?: string }): GitStepSnapshot | null {
        if (!this.isAvailable(workspace)) {
            return null;
        }
        const label = opts?.label;
        const result = this.runGit(workspace, label ? ['stash', 'create', `agent: ${label}`] : ['stash', 'create']);
        const commit = result.stdout.trim();
        if (!commit) {
            return null;
        }
        const snapshot: GitStepSnapshot = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            sessionId: opts?.sessionId,
            messageId: opts?.messageId,
            workspace,
            commit,
            label,
            timestamp: Date.now(),
            diffStats: this.captureDiffStats(workspace, commit)
        };
        if (opts?.messageId) {
            this.byMessage.set(opts.messageId, snapshot.id);
        }
        this.snapshots.set(snapshot.id, snapshot);
        this.pinRef(snapshot);
        return snapshot;
    }

    /** Bind a snapshot to the session message id that produced its step. */
    bind(snapshotId: string, messageId: string): void {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot || !messageId) {
            return;
        }
        snapshot.messageId = messageId;
        this.byMessage.set(messageId, snapshotId);
    }

    resolveByMessage(messageId: string): GitStepSnapshot | null {
        const id = this.byMessage.get(messageId);
        return (id && this.snapshots.get(id)) || null;
    }

    get(snapshotId: string): GitStepSnapshot | null {
        return this.snapshots.get(snapshotId) || null;
    }

    list(sessionId?: string): GitStepSnapshot[] {
        const all = Array.from(this.snapshots.values())
            .sort((left, right) => left.timestamp - right.timestamp);
        if (!sessionId) {
            return all;
        }
        return all.filter(snapshot => snapshot.sessionId === sessionId);
    }

    listReverts(sessionId: string): GitRevertRecord[] {
        return [...(this.revertStacks.get(sessionId) ?? [])];
    }

    clear(sessionId: string): void {
        for (const [id, snapshot] of this.snapshots) {
            if (snapshot.sessionId === sessionId) {
                this.snapshots.delete(id);
                if (snapshot.messageId) {
                    this.byMessage.delete(snapshot.messageId);
                }
                this.deleteRef(snapshot);
            }
        }
        this.revertStacks.delete(sessionId);
    }

    /** Diff a step snapshot against the current working tree. */
    diff(snapshot: GitStepSnapshot): GitStepDiff {
        const numstat = this.runGit(snapshot.workspace, ['diff', '--numstat', snapshot.commit]);
        const rawPatch = this.runGit(snapshot.workspace, ['diff', '--unified=3', snapshot.commit]).stdout;
        const files: GitStepDiffFile[] = [];
        let totalAdditions = 0;
        let totalDeletions = 0;
        for (const line of numstat.stdout.split('\n')) {
            const match = /^(\S+)\t(\S+)\t(.*)$/.exec(line);
            if (!match) {
                continue;
            }
            const additions = match[1] === '-' ? 0 : Number(match[1]);
            const deletions = match[2] === '-' ? 0 : Number(match[2]);
            const filePath = match[3].trim();
            const status = additions > 0 && deletions === 0
                ? 'added'
                : additions === 0 && deletions > 0 ? 'deleted' : 'modified';
            totalAdditions += additions;
            totalDeletions += deletions;
            files.push({
                filePath,
                status,
                additions,
                deletions,
                patch: this.filePatch(snapshot.workspace, snapshot.commit, filePath)
            });
        }
        return {
            snapshotId: snapshot.id,
            messageId: snapshot.messageId,
            commit: snapshot.commit,
            workspace: snapshot.workspace,
            files,
            totalAdditions,
            totalDeletions,
            rawPatch
        };
    }

    diffByMessage(messageId: string): GitStepDiff | null {
        const snapshot = this.resolveByMessage(messageId);
        return snapshot ? this.diff(snapshot) : null;
    }

    /** Revert the working tree to the snapshot bound to a message id. */
    revert(messageId: string, sessionId: string): GitRevertResult {
        const snapshot = this.resolveByMessage(messageId);
        if (!snapshot) {
            return { reverted: false, error: `no git step snapshot bound to message ${messageId}` };
        }
        return this.revertToSnapshot(snapshot, sessionId);
    }

    /** Restore the working tree captured just before the last revert. */
    unrevert(sessionId: string): GitRevertResult {
        const stack = this.revertStacks.get(sessionId);
        const record = stack?.pop();
        if (!record) {
            return { reverted: false, error: 'no revert in progress for this session' };
        }
        if (stack?.length) {
            this.revertStacks.set(sessionId, stack);
        } else {
            this.revertStacks.delete(sessionId);
        }
        const snapshot = this.snapshots.get(record.snapshotId);
        if (!snapshot) {
            return { reverted: false, error: 'step snapshot no longer available' };
        }
        const reset = this.runGit(snapshot.workspace, ['reset', '--hard', record.fromCommit]);
        if (reset.exitCode !== 0) {
            return { reverted: false, error: reset.stderr.trim() || 'git reset failed' };
        }
        if (this.options.cleanUntracked !== false) {
            this.runGit(snapshot.workspace, ['clean', '-fd']);
        }
        return {
            reverted: true,
            snapshotId: record.snapshotId,
            messageId: record.messageId,
            commit: record.fromCommit
        };
    }

    private revertToSnapshot(snapshot: GitStepSnapshot, sessionId: string): GitRevertResult {
        const current = this.runGit(snapshot.workspace, ['stash', 'create', 'agent: pre-revert']);
        const fromCommit = current.stdout.trim() || this.headCommit(snapshot.workspace);
        if (!fromCommit) {
            return { reverted: false, error: 'no HEAD commit to restore from' };
        }
        const changedFiles = this.runGit(snapshot.workspace, ['diff', '--name-only', snapshot.commit])
            .stdout.split('\n').filter(Boolean).length;
        const reset = this.runGit(snapshot.workspace, ['reset', '--hard', snapshot.commit]);
        if (reset.exitCode !== 0) {
            return { reverted: false, error: reset.stderr.trim() || 'git reset failed' };
        }
        if (this.options.cleanUntracked !== false) {
            this.runGit(snapshot.workspace, ['clean', '-fd']);
        }
        const record: GitRevertRecord = {
            sessionId,
            snapshotId: snapshot.id,
            messageId: snapshot.messageId,
            fromCommit,
            revertedAt: Date.now()
        };
        const stack = this.revertStacks.get(sessionId) ?? [];
        stack.push(record);
        this.revertStacks.set(sessionId, stack);
        return {
            reverted: true,
            snapshotId: snapshot.id,
            messageId: snapshot.messageId,
            commit: snapshot.commit,
            restoredFiles: changedFiles
        };
    }

    private captureDiffStats(workspace: string, commit: string): GitStepSnapshotDiffStats | undefined {
        const numstat = this.runGit(workspace, ['diff', '--numstat', `${commit}^`, commit]);
        if (numstat.exitCode !== 0 || !numstat.stdout.trim()) {
            return undefined;
        }
        let filesChanged = 0;
        let totalAdditions = 0;
        let totalDeletions = 0;
        for (const line of numstat.stdout.split('\n')) {
            const match = /^(\S+)\t(\S+)\t/.exec(line);
            if (!match) {
                continue;
            }
            filesChanged++;
            totalAdditions += match[1] === '-' ? 0 : Number(match[1]);
            totalDeletions += match[2] === '-' ? 0 : Number(match[2]);
        }
        return { filesChanged, totalAdditions, totalDeletions };
    }

    private filePatch(workspace: string, commit: string, filePath: string): string | undefined {
        const result = this.runGit(workspace, ['diff', '--unified=3', commit, '--', filePath]);
        return result.exitCode === 0 ? result.stdout : undefined;
    }

    private headCommit(workspace: string): string {
        return this.runGit(workspace, ['rev-parse', 'HEAD']).stdout.trim();
    }

    private pinRef(snapshot: GitStepSnapshot): void {
        this.runGit(snapshot.workspace, ['update-ref', `${GIT_SNAPSHOT_REF_PREFIX}${snapshot.id}`, snapshot.commit]);
    }

    private deleteRef(snapshot: GitStepSnapshot): void {
        this.runGit(snapshot.workspace, ['update-ref', '-d', `${GIT_SNAPSHOT_REF_PREFIX}${snapshot.id}`]);
    }

    private runGit(workspace: string, args: string[]): { stdout: string; stderr: string; exitCode: number } {
        const result = spawnSync('git', args, {
            cwd: workspace,
            timeout: this.options.timeoutMs ?? 10000,
            maxBuffer: 32 * 1024 * 1024,
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return {
            stdout: String(result.stdout ?? ''),
            stderr: String(result.stderr ?? ''),
            exitCode: typeof result.status === 'number' ? result.status : 1
        };
    }
}

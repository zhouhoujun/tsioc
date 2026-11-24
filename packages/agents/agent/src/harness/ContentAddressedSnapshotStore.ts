import type { FileAdapter } from '@tsdi/common';
import { dirnameAgentPath } from '../AgentWorkspacePath';

const SNAPSHOT_DIR = '.tsdi-agent/snapshots';
const BLOB_DIR = 'blobs';
const MANIFEST_SUFFIX = '.json';

/** One recorded file change: content before and after the turn (null = absent). */
export interface ContentSnapshotFile {
    filePath: string;
    before: string | null;
    after: string | null;
}

/** Manifest entry: content is stored once per hash in the workspace blob store. */
export interface ContentSnapshotEntry {
    path: string;
    beforeHash: string | null;
    afterHash: string | null;
}

export interface ContentSnapshotManifest {
    id: string;
    sessionId: string;
    workspace: string;
    messageId?: string;
    createdAt: number;
    files: ContentSnapshotEntry[];
}

export interface ContentSnapshotDiffFile {
    filePath: string;
    status: 'added' | 'modified' | 'deleted';
}

export interface ContentSnapshotDiff {
    snapshotId: string;
    messageId?: string;
    workspace: string;
    files: ContentSnapshotDiffFile[];
    totalAdditions: number;
    totalDeletions: number;
}

export interface ContentSnapshotRestoreResult {
    restored: boolean;
    files: number;
    snapshotId?: string;
    messageId?: string;
    error?: string;
}

/** Stable content hash without a node crypto dependency (two FNV-1a passes + length). */
export function hashSnapshotContent(text: string): string {
    let a = 0x811c9dc5;
    let b = 0x01000193;
    for (let index = 0; index < text.length; index++) {
        const code = text.charCodeAt(index);
        a ^= code;
        a = Math.imul(a, 0x01000193) >>> 0;
        b = (b ^ (code + index)) >>> 0;
        b = Math.imul(b, 0x85ebca6b) >>> 0;
    }
    return `${text.length.toString(16)}-${a.toString(16)}${b.toString(16)}`;
}

/** Workspace-relative slash path used inside manifests. */
export function relativeSnapshotPath(workspace: string, filePath: string): string {
    const root = String(workspace || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const target = String(filePath || '').replace(/\\/g, '/');
    if (root && target.startsWith(root + '/')) {
        return target.slice(root.length + 1);
    }
    return target.replace(/^\.?\//, '');
}

/**
 * P1.2: durable content-addressed snapshots for non-git workspaces.
 *
 * File contents are written once per hash under
 * `<workspace>/.tsdi-agent/snapshots/blobs/<hash>`; each turn writes a small
 * manifest at `<workspace>/.tsdi-agent/snapshots/<session>/<message>.json`.
 * Manifests allow message-level revert/unrevert without inlining file bodies
 * in the session database and without requiring a git checkout.
 */
export class ContentAddressedSnapshotStore {
    private readonly staging = new Map<string, Map<string, ContentSnapshotFile>>();
    private readonly manifests = new Map<string, ContentSnapshotManifest>();
    private readonly lastReverted = new Map<string, string>();

    constructor(private readonly adapter: FileAdapter) {
    }

    /** Drop any staged (uncommitted) files, e.g. at the start of a new turn. */
    begin(sessionId: string): void {
        this.staging.delete(sessionId);
    }

    /** Record a file change; repeated writes keep the first before and last after. */
    record(sessionId: string, files: ContentSnapshotFile[]): void {
        const map = this.staging.get(sessionId) ?? new Map<string, ContentSnapshotFile>();
        for (const file of files) {
            if (!file?.filePath) {
                continue;
            }
            const existing = map.get(file.filePath);
            if (existing) {
                existing.after = file.after;
            } else {
                map.set(file.filePath, { ...file });
            }
        }
        if (map.size) {
            this.staging.set(sessionId, map);
        } else {
            this.staging.delete(sessionId);
        }
    }

    /** Persist the staged files as one manifest bound to the assistant message. */
    async commit(sessionId: string, workspace: string, messageId?: string): Promise<ContentSnapshotManifest | null> {
        const staged = this.staging.get(sessionId);
        if (!staged?.size || !workspace) {
            return null;
        }
        const id = messageId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const files: ContentSnapshotEntry[] = [];
        for (const file of staged.values()) {
            files.push({
                path: relativeSnapshotPath(workspace, file.filePath),
                beforeHash: await this.storeBlob(workspace, file.before),
                afterHash: await this.storeBlob(workspace, file.after)
            });
        }
        const manifest: ContentSnapshotManifest = {
            id, sessionId, workspace,
            ...(messageId ? { messageId } : {}),
            createdAt: Date.now(),
            files
        };
        await this.hostWriteManifest(manifest);
        this.manifests.set(id, manifest);
        this.staging.delete(sessionId);
        return manifest;
    }

    async list(sessionId: string, workspace?: string): Promise<ContentSnapshotManifest[]> {
        const known = Array.from(this.manifests.values()).filter(item => item.sessionId === sessionId);
        if (!workspace) {
            return known.sort((left, right) => right.createdAt - left.createdAt);
        }
        const dir = this.sessionDir(workspace, sessionId);
        let entries: Awaited<ReturnType<FileAdapter['list']>> = [];
        try {
            entries = await this.adapter.list(dir);
        } catch {
            entries = [];
        }
        const merged = new Map(known.map(item => [item.id, item]));
        for (const entry of entries) {
            if (!entry?.name?.endsWith(MANIFEST_SUFFIX)) {
                continue;
            }
            const manifest = await this.readManifest(this.adapter.join(dir, entry.name));
            if (manifest) {
                merged.set(manifest.id, manifest);
            }
        }
        return Array.from(merged.values())
            .filter(item => item.sessionId === sessionId)
            .sort((left, right) => right.createdAt - left.createdAt);
    }

    async get(sessionId: string, workspace: string, id: string): Promise<ContentSnapshotManifest | undefined> {
        const cached = this.manifests.get(id);
        if (cached) {
            return cached;
        }
        const manifest = await this.readManifest(this.manifestPath(workspace, sessionId, id));
        if (manifest) {
            this.manifests.set(manifest.id, manifest);
        }
        return manifest ?? undefined;
    }

    /** Diff the manifest's post-turn state against the current workspace files. */
    async diff(sessionId: string, workspace: string, id: string): Promise<ContentSnapshotDiff | null> {
        const manifest = await this.get(sessionId, workspace, id);
        if (!manifest) {
            return null;
        }
        const files: ContentSnapshotDiffFile[] = [];
        for (const entry of manifest.files) {
            const filePath = this.resolvePath(manifest.workspace, entry.path);
            const exists = this.adapter.existsSync(filePath);
            if (!exists) {
                if (entry.afterHash !== null) {
                    files.push({ filePath: entry.path, status: 'deleted' });
                }
                continue;
            }
            const current = await this.adapter.readText(filePath).catch(() => null);
            const hash = current === null ? null : hashSnapshotContent(current);
            if (hash === entry.afterHash) {
                continue;
            }
            files.push({ filePath: entry.path, status: entry.afterHash === null ? 'added' : 'modified' });
        }
        return {
            snapshotId: manifest.id,
            ...(manifest.messageId ? { messageId: manifest.messageId } : {}),
            workspace: manifest.workspace,
            files,
            totalAdditions: 0,
            totalDeletions: 0
        };
    }

    /** Restore the pre-turn (`before`) or post-turn (`after`) content of a manifest. */
    async restore(
        sessionId: string,
        workspace: string,
        id: string,
        which: 'before' | 'after',
        paths?: string[]
    ): Promise<ContentSnapshotRestoreResult> {
        const manifest = await this.get(sessionId, workspace, id);
        if (!manifest) {
            return { restored: false, files: 0, error: 'snapshot not found' };
        }
        const selected = paths?.length ? new Set(paths.map(path => path.replace(/\\/g, '/'))) : undefined;
        let restored = 0;
        for (const entry of manifest.files) {
            if (selected && !selected.has(entry.path)) {
                continue;
            }
            const hash = which === 'before' ? entry.beforeHash : entry.afterHash;
            const filePath = this.resolvePath(manifest.workspace, entry.path);
            if (hash === null) {
                await this.adapter.remove(filePath, { force: true }).catch(() => undefined);
                restored++;
                continue;
            }
            const content = await this.readBlob(manifest.workspace, hash);
            if (content === null) {
                continue;
            }
            await this.adapter.mkdir(dirnameAgentPath(filePath), { recursive: true });
            await this.adapter.writeText(filePath, content);
            restored++;
        }
        if (which === 'before') {
            this.lastReverted.set(sessionId, id);
        } else {
            this.lastReverted.delete(sessionId);
        }
        return { restored: true, files: restored, snapshotId: manifest.id, messageId: manifest.messageId };
    }

    /** The message id reverted last for a session (`unrevert` target). */
    lastRevertedId(sessionId: string): string | undefined {
        return this.lastReverted.get(sessionId);
    }

    private async storeBlob(workspace: string, content: string | null): Promise<string | null> {
        if (content === null) {
            return null;
        }
        const hash = hashSnapshotContent(content);
        const path = this.blobPath(workspace, hash);
        if (!this.adapter.existsSync(path)) {
            await this.adapter.mkdir(dirnameAgentPath(path), { recursive: true });
            await this.adapter.writeText(path, content);
        }
        return hash;
    }

    private async readBlob(workspace: string, hash: string): Promise<string | null> {
        return this.adapter.readText(this.blobPath(workspace, hash)).catch(() => null);
    }

    private async hostWriteManifest(manifest: ContentSnapshotManifest): Promise<void> {
        const path = this.manifestPath(manifest.workspace, manifest.sessionId, manifest.id);
        await this.adapter.mkdir(dirnameAgentPath(path), { recursive: true });
        await this.adapter.writeText(path, JSON.stringify(manifest));
    }

    private async readManifest(path: string): Promise<ContentSnapshotManifest | null> {
        const text = await this.adapter.readText(path).catch(() => null);
        if (!text) {
            return null;
        }
        try {
            const parsed = JSON.parse(text);
            return parsed && typeof parsed.id === 'string' && Array.isArray(parsed.files) ? parsed : null;
        } catch {
            return null;
        }
    }

    private resolvePath(workspace: string, relative: string): string {
        return this.adapter.join(workspace, relative);
    }

    private snapshotRoot(workspace: string): string {
        return this.adapter.join(workspace, SNAPSHOT_DIR);
    }

    private sessionDir(workspace: string, sessionId: string): string {
        return this.adapter.join(this.snapshotRoot(workspace), sessionId);
    }

    private manifestPath(workspace: string, sessionId: string, id: string): string {
        return this.adapter.join(this.sessionDir(workspace, sessionId), `${id}${MANIFEST_SUFFIX}`);
    }

    private blobPath(workspace: string, hash: string): string {
        return this.adapter.join(this.snapshotRoot(workspace), BLOB_DIR, hash);
    }
}

export interface ArtifactDirectoryEntry {
    name: string;
    kind: 'file' | 'directory' | 'other';
}

/** Minimal filesystem surface used by the artifact store (FileAdapter satisfies it). */
export interface ArtifactStoreAdapter {
    join(...paths: string[]): string;
    readText(path: string): Promise<string>;
    writeText(path: string, content: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    remove(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
    existsSync(path: string): boolean;
    list(path: string): Promise<ArtifactDirectoryEntry[]>;
}

const ARTIFACT_DIR = '.tsdi-agent/artifacts';
const MANIFEST = 'manifest.json';

export interface ArtifactFileInput {
    path: string;
    content: string;
}

export interface ArtifactManifest {
    id: string;
    title: string;
    entry: string;
    files: string[];
    mime: string;
    createdAt: number;
    updatedAt: number;
}

export interface ArtifactCreateInput {
    title: string;
    entry: string;
    files: ArtifactFileInput[];
    mime?: string;
}

export interface ArtifactUpdateInput {
    title?: string;
    entry?: string;
    files?: ArtifactFileInput[];
    mime?: string;
}

export interface ArtifactReadResult {
    manifest: ArtifactManifest;
    path: string;
    content: string;
}

/** Reject empty/absolute/`..` paths so artifacts stay inside their folder. */
export function normalizeArtifactPath(path: string): string {
    const raw = String(path || '').trim().replace(/\\/g, '/');
    if (!raw || raw.startsWith('/') || /^[A-Za-z]:\//.test(raw) || raw.split('/').includes('..')) {
        throw new Error(`Invalid artifact file path: ${path}`);
    }
    const value = raw.replace(/^\.\//, '');
    if (!value) {
        throw new Error(`Invalid artifact file path: ${path}`);
    }
    return value;
}

function normalizeMime(mime: string | undefined, entry: string): string {
    if (mime && typeof mime === 'string') {
        return mime;
    }
    return entry.endsWith('.html') || entry.endsWith('.htm') ? 'text/html'
        : entry.endsWith('.md') ? 'text/markdown'
            : entry.endsWith('.json') ? 'application/json'
                : entry.endsWith('.svg') ? 'image/svg+xml'
                    : 'text/plain';
}

/**
 * P2.1: local artifact provider. Each artifact is a directory under
 * `<workspace>/.tsdi-agent/artifacts/<id>/` with a `manifest.json` (title,
 * entry file, file list, mime) and the artifact files themselves.
 */
export class ArtifactStore {
    private readonly known = new Map<string, ArtifactManifest>();

    constructor(private readonly adapter: ArtifactStoreAdapter) {
    }

    async list(workspace: string | undefined): Promise<ArtifactManifest[]> {
        if (!workspace) {
            return [];
        }
        const root = this.root(workspace);
        let entries: ArtifactDirectoryEntry[] = [];
        try {
            entries = await this.adapter.list(root);
        } catch {
            entries = [];
        }
        for (const entry of entries) {
            if (entry.kind !== 'directory' && entry.kind !== 'file') {
                continue;
            }
            const manifest = await this.readManifest(this.adapter.join(root, entry.name, MANIFEST));
            if (manifest) {
                this.known.set(manifest.id, manifest);
            }
        }
        return Array.from(this.known.values())
            .filter(item => item.files.length)
            .sort((left, right) => right.updatedAt - left.updatedAt);
    }

    async get(workspace: string | undefined, id: string): Promise<ArtifactManifest | undefined> {
        if (!workspace || !id) {
            return undefined;
        }
        const cached = this.known.get(id);
        if (cached) {
            return cached;
        }
        const manifest = await this.readManifest(this.manifestPath(workspace, id));
        if (manifest) {
            this.known.set(manifest.id, manifest);
        }
        return manifest ?? undefined;
    }

    async create(workspace: string | undefined, input: ArtifactCreateInput): Promise<ArtifactManifest> {
        if (!workspace) {
            throw new Error('Artifact store requires a session workspace.');
        }
        const files = this.normalizeFiles(input.files);
        if (!files.length) {
            throw new Error('Artifact requires at least one file.');
        }
        const entry = normalizeArtifactPath(input.entry || files[0].path);
        if (!files.some(file => file.path === entry)) {
            throw new Error(`Artifact entry "${entry}" is not one of the provided files.`);
        }
        const now = Date.now();
        const manifest: ArtifactManifest = {
            id: `art-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            title: String(input.title || entry).trim() || entry,
            entry,
            files: files.map(file => file.path),
            mime: normalizeMime(input.mime, entry),
            createdAt: now,
            updatedAt: now
        };
        await this.writeFiles(workspace, manifest.id, files);
        await this.writeManifest(workspace, manifest);
        return manifest;
    }

    async update(workspace: string | undefined, id: string, patch: ArtifactUpdateInput): Promise<ArtifactManifest> {
        if (!workspace) {
            throw new Error('Artifact store requires a session workspace.');
        }
        const existing = await this.get(workspace, id);
        if (!existing) {
            throw new Error(`Artifact "${id}" not found.`);
        }
        const files = patch.files?.length ? this.normalizeFiles(patch.files) : [];
        if (files.length) {
            await this.writeFiles(workspace, id, files);
        }
        const all = new Set([...existing.files, ...files.map(file => file.path)]);
        const entry = patch.entry ? normalizeArtifactPath(patch.entry) : existing.entry;
        if (!all.has(entry)) {
            throw new Error(`Artifact entry "${entry}" is not one of its files.`);
        }
        const manifest: ArtifactManifest = {
            ...existing,
            title: patch.title !== undefined ? String(patch.title).trim() || existing.title : existing.title,
            entry,
            files: Array.from(all),
            mime: normalizeMime(patch.mime ?? existing.mime, entry),
            updatedAt: Date.now()
        };
        await this.writeManifest(workspace, manifest);
        return manifest;
    }

    async remove(workspace: string | undefined, id: string): Promise<boolean> {
        if (!workspace || !id) {
            return false;
        }
        const existing = await this.get(workspace, id);
        if (!existing) {
            return false;
        }
        await this.adapter.remove(this.artifactDir(workspace, id), { recursive: true, force: true }).catch(() => undefined);
        this.known.delete(id);
        return true;
    }

    async read(workspace: string | undefined, id: string, path?: string): Promise<ArtifactReadResult | undefined> {
        const manifest = await this.get(workspace, id);
        if (!workspace || !manifest) {
            return undefined;
        }
        const target = normalizeArtifactPath(path || manifest.entry);
        if (!manifest.files.includes(target)) {
            return undefined;
        }
        const filePath = this.adapter.join(this.artifactDir(workspace, manifest.id), target);
        const content = await this.adapter.readText(filePath).catch(() => null);
        return content === null ? undefined : { manifest, path: target, content };
    }

    async listFiles(workspace: string | undefined, id: string): Promise<string[]> {
        const manifest = await this.get(workspace, id);
        return manifest ? [...manifest.files] : [];
    }

    private normalizeFiles(files: ArtifactFileInput[] | undefined): ArtifactFileInput[] {
        const seen = new Set<string>();
        return (files ?? []).map(file => {
            const path = normalizeArtifactPath(file.path);
            if (seen.has(path)) {
                throw new Error(`Duplicate artifact file: ${path}`);
            }
            seen.add(path);
            return { path, content: String(file.content ?? '') };
        });
    }

    private async writeFiles(workspace: string, id: string, files: ArtifactFileInput[]): Promise<void> {
        const dir = this.artifactDir(workspace, id);
        await this.adapter.mkdir(dir, { recursive: true });
        for (const file of files) {
            const target = this.adapter.join(dir, file.path);
            await this.adapter.mkdir(this.dirname(target), { recursive: true });
            await this.adapter.writeText(target, file.content);
        }
    }

    private async writeManifest(workspace: string, manifest: ArtifactManifest): Promise<void> {
        await this.adapter.mkdir(this.artifactDir(workspace, manifest.id), { recursive: true });
        await this.adapter.writeText(this.manifestPath(workspace, manifest.id), JSON.stringify(manifest));
        this.known.set(manifest.id, manifest);
    }

    private async readManifest(path: string): Promise<ArtifactManifest | null> {
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

    private dirname(path: string): string {
        const index = path.lastIndexOf('/');
        return index > 0 ? path.slice(0, index) : path;
    }

    private root(workspace: string): string {
        return this.adapter.join(workspace, ARTIFACT_DIR);
    }

    private artifactDir(workspace: string, id: string): string {
        return this.adapter.join(this.root(workspace), id);
    }

    private manifestPath(workspace: string, id: string): string {
        return this.adapter.join(this.artifactDir(workspace, id), MANIFEST);
    }
}

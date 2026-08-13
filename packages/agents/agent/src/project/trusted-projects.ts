import { FileAdapter } from '@tsdi/common';
import { dirnameAgentPath } from '../AgentWorkspacePath';

export interface TrustedProjectRecord {
    path: string;
    trustedAt: number;
    lastUsedAt?: number;
}

export interface TrustedProjectStoreOptions {
    fileAdapter: FileAdapter;
    root: string;
    fileName?: string;
}

export interface TrustStatus {
    trusted: boolean;
    record?: TrustedProjectRecord;
    storePath?: string;
}

const DEFAULT_FILE_NAME = 'trusted-projects.json';

function normalizeProjectPath(fileAdapter: FileAdapter, pathValue: string): string {
    return String(pathValue || '').trim() || '';
}

export class TrustedProjectStore {
    private readonly fileAdapter: FileAdapter;
    private readonly storePath: string;
    private readonly fileName: string;

    constructor(options: TrustedProjectStoreOptions) {
        this.fileAdapter = options.fileAdapter;
        this.fileName = options.fileName?.trim() || DEFAULT_FILE_NAME;
        this.storePath = this.fileAdapter.join(options.root, this.fileName);
    }

    isTrusted(projectPath: string): TrustStatus {
        const normalized = normalizeProjectPath(this.fileAdapter, projectPath);
        if (!normalized) {
            return { trusted: false };
        }
        const record = this.findRecord(normalized);
        return record
            ? { trusted: true, record, storePath: this.storePath }
            : { trusted: false, storePath: this.storePath };
    }

    trust(projectPath: string): TrustedProjectRecord {
        const normalized = normalizeProjectPath(this.fileAdapter, projectPath);
        if (!normalized) {
            throw new Error('Cannot trust an empty project path.');
        }
        const records = this.readRecords();
        const existing = records.find(record => this.sameProject(record.path, normalized));
        const now = Date.now();
        const record: TrustedProjectRecord = existing
            ? { ...existing, lastUsedAt: now }
            : { path: normalized, trustedAt: now, lastUsedAt: now };
        const next = existing
            ? records.map(candidate => this.sameProject(candidate.path, normalized) ? record : candidate)
            : [...records, record];
        this.writeRecords(next);
        return record;
    }

    untrust(projectPath: string): boolean {
        const normalized = normalizeProjectPath(this.fileAdapter, projectPath);
        if (!normalized) {
            return false;
        }
        const records = this.readRecords();
        const next = records.filter(record => !this.sameProject(record.path, normalized));
        if (next.length === records.length) {
            return false;
        }
        this.writeRecords(next);
        return true;
    }

    list(): TrustedProjectRecord[] {
        return this.readRecords();
    }

    storePathFor(_projectPath: string): string {
        return this.storePath;
    }

    private readRecords(): TrustedProjectRecord[] {
        try {
            if (!this.fileAdapter.existsSync(this.storePath)) {
                return [];
            }
            const raw = this.fileAdapter.readJSONSync<unknown>(this.storePath);
            if (!Array.isArray(raw)) {
                return [];
            }
            return raw
                .filter((item): item is TrustedProjectRecord =>
                    !!item && typeof item === 'object' && typeof (item as any).path === 'string')
                .map(item => ({
                    path: String((item as any).path),
                    trustedAt: Number((item as any).trustedAt || 0),
                    lastUsedAt: Number((item as any).lastUsedAt ?? ((item as any).trustedAt || 0))
                }));
        } catch {
            return [];
        }
    }

    private writeRecords(records: TrustedProjectRecord[]): void {
        try {
            const parent = dirnameAgentPath(this.storePath);
            if (!this.fileAdapter.existsSync(parent)) {
                this.fileAdapter.mkdir(parent, { recursive: true }).catch(() => undefined);
            }
            this.fileAdapter.writeText(this.storePath, JSON.stringify(records, null, 2));
        } catch {
            // trust state persistence is best-effort; a broken store must not
            // block agent startup or a trust decision
        }
    }

    private findRecord(projectPath: string): TrustedProjectRecord | undefined {
        return this.readRecords().find(record => this.sameProject(record.path, projectPath));
    }

    private sameProject(a: string, b: string): boolean {
        return this.fileAdapter.resolve(a) === this.fileAdapter.resolve(b);
    }
}

import { createHash } from 'node:crypto';
import { noReact } from '@tsdi/components';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { WorkflowVersionKind, WorkflowVersionSummary } from '../src/visual/workflow-store';
import {
    createSqliteDatabase,
    defaultWorkflowDatabaseFile,
    isSqliteAvailable,
    SqliteDatabase
} from './SqliteWorkflowDefinitionStore';

export interface WorkflowReleaseRecord {
    workflowId: string;
    version: number;
    publishedAt: string;
    publishedBy?: string;
}

export interface WorkflowVersionAppendOptions {
    kind?: WorkflowVersionKind;
    createdBy?: string;
    /** Draft-save snapshots kept per workflow (published ones are kept forever). */
    keepSaves?: number;
}

export interface WorkflowVersionListResult {
    items: WorkflowVersionSummary[];
    release?: WorkflowReleaseRecord;
}

/**
 * Immutable version history beside the mutable workflow draft.
 *
 * Draft autosave only rewrites `workflows`; an explicit save records a
 * version, publishing promotes a version and moves the release pointer, and
 * run/webhook entry points execute the released version when one exists.
 */
export interface WorkflowVersionStore {
    /** Record a version; identical content reuses the previous snapshot. */
    append(definition: VisualWorkflowDefinition, options?: WorkflowVersionAppendOptions): Promise<WorkflowVersionSummary>;
    list(workflowId: string, limit?: number): Promise<WorkflowVersionListResult>;
    get(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined>;
    release(workflowId: string): Promise<WorkflowReleaseRecord | undefined>;
    publish(workflowId: string, version: number, publishedBy?: string): Promise<WorkflowReleaseRecord>;
    removeWorkflow(workflowId: string): Promise<void>;
    clear(): Promise<void>;
    close?(): void;
}

/** SHA-256 of the serialized definition: the dedupe key for version rows. */
export function versionContentHash(definition: VisualWorkflowDefinition): string {
    return createHash('sha256').update(JSON.stringify(definition)).digest('hex');
}

function versionSummary(
    definition: VisualWorkflowDefinition,
    version: number,
    kind: WorkflowVersionKind,
    hash: string,
    createdBy?: string,
    createdAt?: string
): WorkflowVersionSummary {
    return {
        workflowId: definition.id,
        version,
        kind,
        contentHash: hash,
        createdAt: createdAt || new Date().toISOString(),
        createdBy,
        name: definition.name,
        nodeCount: definition.nodes?.length || 0,
        connectionCount: definition.connections?.length || 0
    };
}

/**
 * In-memory version history used by tests and hosts without SQLite.
 */
export class InMemoryWorkflowVersionStore implements WorkflowVersionStore {
    [noReact] = true;
    private readonly versions = new Map<string, Array<{ summary: WorkflowVersionSummary; definition: VisualWorkflowDefinition }>>();
    private readonly releases = new Map<string, WorkflowReleaseRecord>();

    async append(
        definition: VisualWorkflowDefinition,
        options: WorkflowVersionAppendOptions = {}
    ): Promise<WorkflowVersionSummary> {
        const kind = options.kind || 'save';
        const hash = versionContentHash(definition);
        const list = this.versions.get(definition.id) || [];
        const latest = list[list.length - 1];
        if (latest && latest.summary.contentHash === hash) {
            if (kind === 'publish' && latest.summary.kind !== 'publish') {
                latest.summary = { ...latest.summary, kind: 'publish' };
            }
            return { ...latest.summary };
        }
        const summary = versionSummary(definition, (latest?.summary.version || 0) + 1, kind, hash, options.createdBy);
        list.push({ summary, definition: JSON.parse(JSON.stringify(definition)) as VisualWorkflowDefinition });
        this.versions.set(definition.id, this.prune(definition.id, list, options.keepSaves ?? 20));
        return { ...summary };
    }

    async list(workflowId: string, limit = 50): Promise<WorkflowVersionListResult> {
        return {
            items: (this.versions.get(workflowId) || [])
                .map(entry => ({ ...entry.summary }))
                .sort((a, b) => b.version - a.version)
                .slice(0, Math.max(1, limit)),
            release: this.releases.get(workflowId)
        };
    }

    async get(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined> {
        const entry = (this.versions.get(workflowId) || []).find(item => item.summary.version === version);
        return entry ? JSON.parse(JSON.stringify(entry.definition)) : undefined;
    }

    async release(workflowId: string): Promise<WorkflowReleaseRecord | undefined> {
        return this.releases.get(workflowId);
    }

    async publish(workflowId: string, version: number, publishedBy?: string): Promise<WorkflowReleaseRecord> {
        const exists = (this.versions.get(workflowId) || []).some(item => item.summary.version === version);
        if (!exists) {
            throw new Error(`Version not found: ${workflowId} v${version}`);
        }
        const release: WorkflowReleaseRecord = {
            workflowId,
            version,
            publishedAt: new Date().toISOString(),
            publishedBy
        };
        this.releases.set(workflowId, release);
        return { ...release };
    }

    async removeWorkflow(workflowId: string): Promise<void> {
        this.versions.delete(workflowId);
        this.releases.delete(workflowId);
    }

    async clear(): Promise<void> {
        this.versions.clear();
        this.releases.clear();
    }

    protected prune(
        workflowId: string,
        list: Array<{ summary: WorkflowVersionSummary; definition: VisualWorkflowDefinition }>,
        keepSaves: number
    ) {
        const saves = list.filter(entry => entry.summary.kind === 'save');
        if (saves.length <= Math.max(1, keepSaves)) {
            return list;
        }
        const keep = new Set(saves.slice(saves.length - Math.max(1, keepSaves)).map(entry => entry.summary.version));
        return list.filter(entry => entry.summary.kind !== 'save' || keep.has(entry.summary.version));
    }
}

export interface SqliteWorkflowVersionStoreOptions {
    /** SQLite file; defaults to `WORKFLOW_DB_FILE` or ~/.tsdi-agent/workflows.db. */
    file?: string;
    /** Draft-save snapshots kept per workflow (default 20). */
    keepSaves?: number;
}

interface VersionRow {
    workflow_id: string;
    version: number;
    kind: string;
    content_hash: string;
    definition: string;
    created_at: string;
    created_by: string | null;
    name: string | null;
    node_count: number | null;
    connection_count: number | null;
}

interface ReleaseRow {
    workflow_id: string;
    version: number;
    published_at: string;
    published_by: string | null;
}

/**
 * SQLite version history. Shares the workflow database file but only touches
 * its own `workflow_versions` / `workflow_releases` tables, so existing
 * databases upgrade in place without rewriting `workflows`.
 */
export class SqliteWorkflowVersionStore implements WorkflowVersionStore {
    [noReact] = true;
    private readonly file: string;
    private readonly keepSaves: number;
    private db?: SqliteDatabase;

    constructor(options: SqliteWorkflowVersionStoreOptions = {}) {
        this.file = options.file || defaultWorkflowDatabaseFile();
        this.keepSaves = Math.max(1, Number(options.keepSaves) || 20);
    }

    get databaseFile(): string {
        return this.file;
    }

    async append(
        definition: VisualWorkflowDefinition,
        options: WorkflowVersionAppendOptions = {}
    ): Promise<WorkflowVersionSummary> {
        const kind = options.kind || 'save';
        const hash = versionContentHash(definition);
        const db = this.database();
        const latest = db
            .prepare('SELECT version, kind, content_hash FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC LIMIT 1')
            .get(definition.id) as unknown as Pick<VersionRow, 'version' | 'kind' | 'content_hash'> | undefined;
        if (latest && latest.content_hash === hash) {
            if (kind === 'publish' && latest.kind !== 'publish') {
                db.prepare('UPDATE workflow_versions SET kind = ? WHERE workflow_id = ? AND version = ?')
                    .run('publish', definition.id, latest.version);
            }
            const row = db
                .prepare('SELECT * FROM workflow_versions WHERE workflow_id = ? AND version = ?')
                .get(definition.id, latest.version) as unknown as VersionRow;
            return rowToSummary(row);
        }
        const version = Number(latest?.version || 0) + 1;
        const summary = versionSummary(definition, version, kind, hash, options.createdBy);
        db.prepare(`
            INSERT INTO workflow_versions
                (workflow_id, version, kind, content_hash, definition, created_at, created_by, name, node_count, connection_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            summary.workflowId,
            summary.version,
            summary.kind,
            summary.contentHash,
            JSON.stringify(definition),
            summary.createdAt,
            summary.createdBy ?? null,
            summary.name ?? null,
            summary.nodeCount ?? 0,
            summary.connectionCount ?? 0
        );
        this.prune(definition.id, options.keepSaves ?? this.keepSaves);
        return summary;
    }

    async list(workflowId: string, limit = 50): Promise<WorkflowVersionListResult> {
        const rows = this.database()
            .prepare('SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC LIMIT ?')
            .all(workflowId, Math.max(1, limit)) as unknown as VersionRow[];
        return {
            items: rows.map(rowToSummary),
            release: await this.release(workflowId)
        };
    }

    async get(workflowId: string, version: number): Promise<VisualWorkflowDefinition | undefined> {
        const row = this.database()
            .prepare('SELECT definition FROM workflow_versions WHERE workflow_id = ? AND version = ?')
            .get(workflowId, version) as unknown as Pick<VersionRow, 'definition'> | undefined;
        if (!row?.definition) {
            return undefined;
        }
        try {
            return JSON.parse(row.definition) as VisualWorkflowDefinition;
        } catch {
            return undefined;
        }
    }

    async release(workflowId: string): Promise<WorkflowReleaseRecord | undefined> {
        const row = this.database()
            .prepare('SELECT * FROM workflow_releases WHERE workflow_id = ?')
            .get(workflowId) as unknown as ReleaseRow | undefined;
        if (!row) {
            return undefined;
        }
        return {
            workflowId: row.workflow_id,
            version: Number(row.version) || 0,
            publishedAt: row.published_at,
            publishedBy: row.published_by ?? undefined
        };
    }

    async publish(workflowId: string, version: number, publishedBy?: string): Promise<WorkflowReleaseRecord> {
        const exists = this.database()
            .prepare('SELECT version FROM workflow_versions WHERE workflow_id = ? AND version = ?')
            .get(workflowId, version) as unknown as { version: number } | undefined;
        if (!exists) {
            throw new Error(`Version not found: ${workflowId} v${version}`);
        }
        const publishedAt = new Date().toISOString();
        this.database().prepare(`
            INSERT INTO workflow_releases (workflow_id, version, published_at, published_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(workflow_id) DO UPDATE SET
                version = excluded.version,
                published_at = excluded.published_at,
                published_by = excluded.published_by
        `).run(workflowId, version, publishedAt, publishedBy ?? null);
        return { workflowId, version, publishedAt, publishedBy };
    }

    async removeWorkflow(workflowId: string): Promise<void> {
        this.database().prepare('DELETE FROM workflow_versions WHERE workflow_id = ?').run(workflowId);
        this.database().prepare('DELETE FROM workflow_releases WHERE workflow_id = ?').run(workflowId);
    }

    async clear(): Promise<void> {
        this.database().prepare('DELETE FROM workflow_versions').run();
        this.database().prepare('DELETE FROM workflow_releases').run();
    }

    close(): void {
        this.db?.close();
        this.db = undefined;
    }

    protected prune(workflowId: string, keepSaves: number): void {
        this.database().prepare(`
            DELETE FROM workflow_versions
             WHERE workflow_id = ?
               AND kind = 'save'
               AND version NOT IN (
                   SELECT version FROM workflow_versions
                    WHERE workflow_id = ? AND kind = 'save'
                    ORDER BY version DESC LIMIT ?
               )
        `).run(workflowId, workflowId, Math.max(1, keepSaves));
    }

    protected database(): SqliteDatabase {
        if (this.db) {
            return this.db;
        }
        if (!isSqliteAvailable()) {
            throw new Error('SQLite is not available in this Node runtime; use InMemoryWorkflowVersionStore instead.');
        }
        const db = createSqliteDatabase(this.file);
        db.exec(`
            CREATE TABLE IF NOT EXISTS workflow_versions (
                workflow_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                kind TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                definition TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT,
                name TEXT,
                node_count INTEGER NOT NULL DEFAULT 0,
                connection_count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (workflow_id, version)
            );
            CREATE TABLE IF NOT EXISTS workflow_releases (
                workflow_id TEXT PRIMARY KEY,
                version INTEGER NOT NULL,
                published_at TEXT NOT NULL,
                published_by TEXT
            );
        `);
        this.db = db;
        return db;
    }
}

function rowToSummary(row: VersionRow): WorkflowVersionSummary {
    return {
        workflowId: row.workflow_id,
        version: Number(row.version) || 0,
        kind: row.kind === 'publish' ? 'publish' : 'save',
        contentHash: row.content_hash,
        createdAt: row.created_at,
        createdBy: row.created_by ?? undefined,
        name: row.name ?? undefined,
        nodeCount: Number(row.node_count) || 0,
        connectionCount: Number(row.connection_count) || 0
    };
}

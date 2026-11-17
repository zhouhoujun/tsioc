import { Inject, Injectable, token } from '@tsdi/ioc';
import { noReact } from '@tsdi/components';
import {
    createSqliteDatabase,
    defaultWorkflowDatabaseFile,
    isSqliteAvailable,
    SqliteDatabase
} from './SqliteWorkflowDefinitionStore';

export interface WorkflowAuditEntry {
    id: string;
    at: number;
    action: string;
    workflowId?: string;
    actor?: string;
    detail?: Record<string, any>;
}

export interface WorkflowAuditFilter {
    workflowId?: string;
    action?: string;
    limit?: number;
}

export interface WorkflowAuditStore {
    append(entry: Omit<WorkflowAuditEntry, 'id' | 'at'>): Promise<WorkflowAuditEntry>;
    list(filter?: WorkflowAuditFilter): Promise<WorkflowAuditEntry[]>;
    prune(keep: number): Promise<void>;
    clear?(): Promise<void>;
}

export const WORKFLOW_AUDIT_STORE = token<WorkflowAuditStore>('WORKFLOW_AUDIT_STORE');
export const WORKFLOW_AUDIT_LIMIT = token<number>('WORKFLOW_AUDIT_LIMIT');

function nextId(): string {
    return `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function filtered(entries: WorkflowAuditEntry[], filter: WorkflowAuditFilter = {}): WorkflowAuditEntry[] {
    const limit = Math.max(1, Number(filter.limit) || 100);
    return entries
        .filter(entry => (!filter.workflowId || entry.workflowId === filter.workflowId)
            && (!filter.action || entry.action === filter.action))
        .sort((a, b) => b.at - a.at)
        .slice(0, limit);
}

/** Process-local audit history for tests and in-memory servers. */
export class InMemoryWorkflowAuditStore implements WorkflowAuditStore {
    [noReact] = true;
    private entries: WorkflowAuditEntry[] = [];

    async append(entry: Omit<WorkflowAuditEntry, 'id' | 'at'>): Promise<WorkflowAuditEntry> {
        const saved: WorkflowAuditEntry = { ...entry, id: nextId(), at: Date.now() };
        this.entries.push(saved);
        return { ...saved };
    }

    async list(filter: WorkflowAuditFilter = {}): Promise<WorkflowAuditEntry[]> {
        return filtered(this.entries, filter).map(entry => ({ ...entry }));
    }

    async prune(keep: number): Promise<void> {
        const limit = Math.max(1, keep);
        this.entries = this.entries
            .sort((a, b) => b.at - a.at)
            .slice(0, limit);
    }

    async clear(): Promise<void> {
        this.entries = [];
    }
}

export interface SqliteWorkflowAuditStoreOptions {
    file?: string;
}

interface AuditRow {
    id: string;
    at: number;
    action: string;
    workflow_id?: string;
    actor?: string;
    detail?: string;
}

/** SQLite-backed audit history using its own table. */
export class SqliteWorkflowAuditStore implements WorkflowAuditStore {
    [noReact] = true;
    private readonly file: string;
    private db?: SqliteDatabase;

    constructor(options: SqliteWorkflowAuditStoreOptions = {}) {
        this.file = options.file || defaultWorkflowDatabaseFile();
    }

    get databaseFile(): string {
        return this.file;
    }

    async append(entry: Omit<WorkflowAuditEntry, 'id' | 'at'>): Promise<WorkflowAuditEntry> {
        const saved: WorkflowAuditEntry = { ...entry, id: nextId(), at: Date.now() };
        this.database().prepare(`
            INSERT INTO workflow_audit (id, at, action, workflow_id, actor, detail)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            saved.id,
            saved.at,
            saved.action,
            saved.workflowId ?? null,
            saved.actor ?? null,
            saved.detail ? JSON.stringify(saved.detail) : null
        );
        return saved;
    }

    async list(filter: WorkflowAuditFilter = {}): Promise<WorkflowAuditEntry[]> {
        const limit = Math.max(1, Number(filter.limit) || 100);
        const clauses: string[] = [];
        const params: any[] = [];
        if (filter.workflowId) {
            clauses.push('workflow_id = ?');
            params.push(filter.workflowId);
        }
        if (filter.action) {
            clauses.push('action = ?');
            params.push(filter.action);
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const rows = this.database()
            .prepare(`SELECT * FROM workflow_audit ${where} ORDER BY at DESC LIMIT ?`)
            .all(...params, limit) as unknown as AuditRow[];
        return rows.map(row => this.fromRow(row));
    }

    async prune(keep: number): Promise<void> {
        const limit = Math.max(1, keep);
        this.database().prepare(`
            DELETE FROM workflow_audit
            WHERE id NOT IN (SELECT id FROM workflow_audit ORDER BY at DESC LIMIT ?)
        `).run(limit);
    }

    async clear(): Promise<void> {
        this.database().prepare('DELETE FROM workflow_audit').run();
    }

    close(): void {
        this.db?.close();
        this.db = undefined;
    }

    private database(): SqliteDatabase {
        if (this.db) {
            return this.db;
        }
        if (!isSqliteAvailable()) {
            throw new Error('SQLite is not available in this Node runtime; use InMemoryWorkflowAuditStore or upgrade Node.');
        }
        const db = createSqliteDatabase(this.file);
        db.exec(`
            CREATE TABLE IF NOT EXISTS workflow_audit (
                id TEXT PRIMARY KEY,
                at INTEGER NOT NULL,
                action TEXT NOT NULL,
                workflow_id TEXT,
                actor TEXT,
                detail TEXT
            )
        `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_audit_workflow ON workflow_audit(workflow_id, at DESC)');
        this.db = db;
        return db;
    }

    private fromRow(row: AuditRow): WorkflowAuditEntry {
        let detail: Record<string, any> | undefined;
        if (row.detail) {
            try {
                detail = JSON.parse(row.detail);
            } catch {
                detail = undefined;
            }
        }
        return {
            id: row.id,
            at: Number(row.at),
            action: row.action,
            workflowId: row.workflow_id,
            actor: row.actor,
            detail
        };
    }
}

/** Injectable audit recorder used by HTTP controllers. */
@Injectable()
export class WorkflowAuditService {
    constructor(
        @Inject(WORKFLOW_AUDIT_STORE) private store: WorkflowAuditStore,
        @Inject(WORKFLOW_AUDIT_LIMIT) private limit: number
    ) { }

    async record(
        action: string,
        workflowId?: string,
        actor?: string,
        detail?: Record<string, any>
    ): Promise<void> {
        try {
            await this.store.append({ action, workflowId, actor, detail });
            await this.store.prune(Math.max(1, Number(this.limit) || 2000));
        } catch {
            // Auditing must never fail the business operation.
        }
    }

    list(filter: WorkflowAuditFilter = {}): Promise<WorkflowAuditEntry[]> {
        return this.store.list(filter);
    }
}

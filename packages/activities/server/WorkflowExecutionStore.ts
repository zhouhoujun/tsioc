import { noReact } from '@tsdi/components';
import { WorkflowExecutionSnapshot } from '../src/visual/types';
import {
    createSqliteDatabase,
    defaultWorkflowDatabaseFile,
    isSqliteAvailable,
    SqliteDatabase
} from './SqliteWorkflowDefinitionStore';

/**
 * Persistent execution history used by the workflow HTTP server.
 *
 * Snapshots are the same serializable shape the designer replays, so a
 * dashboard can render past runs after a restart without loading the workflow
 * definition. Implementations must only create their own tables and never
 * rewrite existing workflow data.
 */
export interface WorkflowExecutionStore {
    save(snapshot: WorkflowExecutionSnapshot): Promise<void>;
    get(executionId: string): Promise<WorkflowExecutionSnapshot | undefined>;
    list(workflowId?: string, limit?: number): Promise<WorkflowExecutionSnapshot[]>;
    /** Keep only the newest `keep` snapshots for one workflow. */
    prune(workflowId: string, keep: number): Promise<void>;
    close?(): void;
}

const DEFAULT_LIST_LIMIT = 50;

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function sorted(snapshots: WorkflowExecutionSnapshot[]): WorkflowExecutionSnapshot[] {
    return snapshots.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
}

/** Default store for tests, browsers and in-memory servers. */
export class InMemoryWorkflowExecutionStore implements WorkflowExecutionStore {
    [noReact] = true;
    private readonly snapshots = new Map<string, WorkflowExecutionSnapshot>();

    async save(snapshot: WorkflowExecutionSnapshot): Promise<void> {
        if (!snapshot?.executionId) {
            return;
        }
        this.snapshots.set(snapshot.executionId, clone(snapshot));
    }

    async get(executionId: string): Promise<WorkflowExecutionSnapshot | undefined> {
        const snapshot = this.snapshots.get(executionId);
        return snapshot ? clone(snapshot) : undefined;
    }

    async list(workflowId?: string, limit = DEFAULT_LIST_LIMIT): Promise<WorkflowExecutionSnapshot[]> {
        const all = Array.from(this.snapshots.values())
            .filter(item => !workflowId || item.workflowId === workflowId);
        return sorted(clone(all)).slice(0, Math.max(1, limit));
    }

    async prune(workflowId: string, keep: number): Promise<void> {
        const limit = Math.max(1, keep);
        const history = sorted(
            Array.from(this.snapshots.values()).filter(item => item.workflowId === workflowId)
        );
        history.slice(limit).forEach(item => this.snapshots.delete(item.executionId));
    }

    clear(): void {
        this.snapshots.clear();
    }
}

export interface SqliteWorkflowExecutionStoreOptions {
    /** SQLite file. Defaults to `$WORKFLOW_DB_FILE` or `~/.tsdi-agent/workflows.db`. */
    file?: string;
}

interface ExecutionRow {
    execution_id: string;
    snapshot: string;
}

/**
 * SQLite-backed execution history. Shares the workflow database file by
 * default, but only touches its own `workflow_executions` table.
 */
export class SqliteWorkflowExecutionStore implements WorkflowExecutionStore {
    [noReact] = true;
    private readonly file: string;
    private db?: SqliteDatabase;

    constructor(options: SqliteWorkflowExecutionStoreOptions = {}) {
        this.file = options.file || defaultWorkflowDatabaseFile();
    }

    get databaseFile(): string {
        return this.file;
    }

    async save(snapshot: WorkflowExecutionSnapshot): Promise<void> {
        if (!snapshot?.executionId) {
            return;
        }
        this.database()
            .prepare(`
                INSERT INTO workflow_executions
                    (execution_id, workflow_id, status, start_time, end_time, error, snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(execution_id) DO UPDATE SET
                    workflow_id = excluded.workflow_id,
                    status = excluded.status,
                    start_time = excluded.start_time,
                    end_time = excluded.end_time,
                    error = excluded.error,
                    snapshot = excluded.snapshot
            `)
            .run(
                snapshot.executionId,
                snapshot.workflowId,
                String(snapshot.status),
                snapshot.startTime ?? null,
                snapshot.endTime ?? null,
                snapshot.error ?? null,
                JSON.stringify(snapshot)
            );
    }

    async get(executionId: string): Promise<WorkflowExecutionSnapshot | undefined> {
        const row = this.database()
            .prepare('SELECT snapshot FROM workflow_executions WHERE execution_id = ?')
            .get(executionId) as unknown as ExecutionRow | undefined;
        return parseSnapshot(row?.snapshot);
    }

    async list(workflowId?: string, limit = DEFAULT_LIST_LIMIT): Promise<WorkflowExecutionSnapshot[]> {
        const size = Math.max(1, limit);
        const rows = workflowId
            ? this.database()
                .prepare('SELECT snapshot FROM workflow_executions WHERE workflow_id = ? ORDER BY start_time DESC LIMIT ?')
                .all(workflowId, size)
            : this.database()
                .prepare('SELECT snapshot FROM workflow_executions ORDER BY start_time DESC LIMIT ?')
                .all(size);
        return (rows as unknown as ExecutionRow[])
            .map(row => parseSnapshot(row.snapshot))
            .filter((item): item is WorkflowExecutionSnapshot => !!item);
    }

    async prune(workflowId: string, keep: number): Promise<void> {
        const limit = Math.max(1, keep);
        this.database()
            .prepare(`
                DELETE FROM workflow_executions
                WHERE workflow_id = ? AND execution_id NOT IN (
                    SELECT execution_id FROM workflow_executions
                    WHERE workflow_id = ?
                    ORDER BY start_time DESC
                    LIMIT ?
                )
            `)
            .run(workflowId, workflowId, limit);
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
            throw new Error('SQLite is not available in this Node runtime; use InMemoryWorkflowExecutionStore or upgrade Node.');
        }
        const db = createSqliteDatabase(this.file);
        db.exec(`
            CREATE TABLE IF NOT EXISTS workflow_executions (
                execution_id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                status TEXT NOT NULL,
                start_time INTEGER,
                end_time INTEGER,
                error TEXT,
                snapshot TEXT NOT NULL
            )
        `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id, start_time DESC)');
        this.db = db;
        return db;
    }
}


function parseSnapshot(json: string | undefined): WorkflowExecutionSnapshot | undefined {
    if (!json) {
        return undefined;
    }
    try {
        return JSON.parse(json) as WorkflowExecutionSnapshot;
    } catch {
        return undefined;
    }
}

import { token } from '@tsdi/ioc';
import { noReact } from '@tsdi/components';
import {
    createSqliteDatabase,
    defaultWorkflowDatabaseFile,
    isSqliteAvailable,
    SqliteDatabase
} from './SqliteWorkflowDefinitionStore';

/** Persisted `flow` / `global` context for a workflow (Node-RED contextStorage). */
export interface WorkflowContextSnapshot {
    flow?: Record<string, any>;
    global?: Record<string, any>;
}

export interface WorkflowContextStore {
    read(workflowId: string): Promise<WorkflowContextSnapshot | undefined>;
    write(workflowId: string, snapshot: WorkflowContextSnapshot): Promise<void>;
    clear(workflowId?: string): Promise<void>;
    close?(): void;
}

export const WORKFLOW_CONTEXT_STORE = token<WorkflowContextStore>('WORKFLOW_CONTEXT_STORE');

function clone<T>(value: T): T {
    if (value === undefined || value === null) {
        return value;
    }
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

/** Process-local context for tests and in-memory servers. */
export class InMemoryWorkflowContextStore implements WorkflowContextStore {
    [noReact] = true;
    private readonly entries = new Map<string, WorkflowContextSnapshot>();

    async read(workflowId: string): Promise<WorkflowContextSnapshot | undefined> {
        const entry = this.entries.get(String(workflowId));
        return entry ? clone(entry) : undefined;
    }

    async write(workflowId: string, snapshot: WorkflowContextSnapshot): Promise<void> {
        this.entries.set(String(workflowId), clone(snapshot));
    }

    async clear(workflowId?: string): Promise<void> {
        if (workflowId) {
            this.entries.delete(String(workflowId));
            return;
        }
        this.entries.clear();
    }
}

export interface SqliteWorkflowContextStoreOptions {
    file?: string;
}

interface ContextRow {
    workflow_id: string;
    flow?: string;
    global?: string;
}

/** SQLite-backed context in its own table; existing tables are untouched. */
export class SqliteWorkflowContextStore implements WorkflowContextStore {
    [noReact] = true;
    private readonly file: string;
    private db?: SqliteDatabase;

    constructor(options: SqliteWorkflowContextStoreOptions = {}) {
        this.file = options.file || defaultWorkflowDatabaseFile();
    }

    get databaseFile(): string {
        return this.file;
    }

    async read(workflowId: string): Promise<WorkflowContextSnapshot | undefined> {
        const row = this.database()
            .prepare('SELECT workflow_id, flow, global FROM workflow_context WHERE workflow_id = ?')
            .get(String(workflowId)) as unknown as ContextRow | undefined;
        if (!row) {
            return undefined;
        }
        return {
            flow: this.parse(row.flow),
            global: this.parse(row.global)
        };
    }

    async write(workflowId: string, snapshot: WorkflowContextSnapshot): Promise<void> {
        this.database().prepare(`
            INSERT INTO workflow_context (workflow_id, flow, global, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(workflow_id) DO UPDATE SET
                flow = excluded.flow,
                global = excluded.global,
                updated_at = excluded.updated_at
        `).run(
            String(workflowId),
            this.stringify(snapshot.flow),
            this.stringify(snapshot.global),
            Date.now()
        );
    }

    async clear(workflowId?: string): Promise<void> {
        if (workflowId) {
            this.database().prepare('DELETE FROM workflow_context WHERE workflow_id = ?').run(String(workflowId));
            return;
        }
        this.database().prepare('DELETE FROM workflow_context').run();
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
            throw new Error('SQLite is not available in this Node runtime; use InMemoryWorkflowContextStore or upgrade Node.');
        }
        const db = createSqliteDatabase(this.file);
        db.exec(`
            CREATE TABLE IF NOT EXISTS workflow_context (
                workflow_id TEXT PRIMARY KEY,
                flow TEXT,
                global TEXT,
                updated_at INTEGER NOT NULL
            )
        `);
        this.db = db;
        return db;
    }

    private parse(value?: string): Record<string, any> | undefined {
        if (!value) {
            return undefined;
        }
        try {
            return JSON.parse(value);
        } catch {
            return undefined;
        }
    }

    private stringify(value: any): string | null {
        if (value === undefined || value === null) {
            return null;
        }
        try {
            return JSON.stringify(value);
        } catch {
            return null;
        }
    }
}

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noReact } from '@tsdi/components';
import { VisualWorkflowDefinition } from '../src/visual/types';
import {
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary
} from '../src/visual/workflow-store';

type SqliteModule = typeof import('node:sqlite');
type SqliteDatabase = import('node:sqlite').DatabaseSync;

let sqliteModule: SqliteModule | undefined;
let sqliteChecked = false;

function loadSqlite(): SqliteModule | undefined {
    if (sqliteChecked) {
        return sqliteModule;
    }
    sqliteChecked = true;
    try {
        // `node:sqlite` ships with Node 22.5+. Keep the require lazy so the
        // activities package still loads in browsers and older Node versions.
        sqliteModule = require('node:sqlite') as SqliteModule;
    } catch {
        sqliteModule = undefined;
    }
    return sqliteModule;
}

export function isSqliteAvailable(): boolean {
    return !!loadSqlite()?.DatabaseSync;
}

export function defaultWorkflowDatabaseFile(): string {
    return process.env.WORKFLOW_DB_FILE
        || path.join(os.homedir(), '.tsdi-agent', 'workflows.db');
}

export interface SqliteWorkflowStoreOptions {
    /** SQLite file. Defaults to `$WORKFLOW_DB_FILE` or `~/.tsdi-agent/workflows.db`. */
    file?: string;
}

interface WorkflowRow {
    id: string;
    name: string;
    description?: string;
    node_count?: number;
    connection_count?: number;
    updated_at?: string;
    definition: string;
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function summarize(definition: VisualWorkflowDefinition): WorkflowDefinitionSummary {
    return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        nodeCount: definition.nodes?.length || 0,
        connectionCount: definition.connections?.length || 0,
        updatedAt: definition.metadata?.updatedAt || new Date().toISOString()
    };
}

/**
 * SQLite-backed workflow store used by `tsdi-agent serve` and other Node hosts.
 * Definitions are stored as JSON so the visual document stays schema-free while
 * library queries use indexed summary columns.
 */
export class SqliteWorkflowDefinitionStore implements WorkflowDefinitionStore {
    [noReact] = true;
    private readonly file: string;
    private db?: SqliteDatabase;

    constructor(options: SqliteWorkflowStoreOptions = {}) {
        this.file = options.file || defaultWorkflowDatabaseFile();
    }

    get databaseFile(): string {
        return this.file;
    }

    async list(): Promise<WorkflowDefinitionSummary[]> {
        const rows = this.database()
            .prepare('SELECT id, name, description, node_count, connection_count, updated_at FROM workflows ORDER BY updated_at DESC')
            .all() as unknown as WorkflowRow[];
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            nodeCount: Number(row.node_count) || 0,
            connectionCount: Number(row.connection_count) || 0,
            updatedAt: row.updated_at
        }));
    }

    async get(id: string): Promise<VisualWorkflowDefinition | undefined> {
        const row = this.database()
            .prepare('SELECT definition FROM workflows WHERE id = ?')
            .get(id) as unknown as WorkflowRow | undefined;
        if (!row?.definition) {
            return undefined;
        }
        try {
            return JSON.parse(row.definition) as VisualWorkflowDefinition;
        } catch {
            return undefined;
        }
    }

    async save(definition: VisualWorkflowDefinition): Promise<WorkflowDefinitionSummary> {
        const saved: VisualWorkflowDefinition = {
            ...clone(definition),
            metadata: {
                ...(definition.metadata || {}),
                updatedAt: new Date().toISOString()
            }
        };
        const summary = summarize(saved);
        this.database()
            .prepare(`
                INSERT INTO workflows (id, name, description, node_count, connection_count, updated_at, definition)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    node_count = excluded.node_count,
                    connection_count = excluded.connection_count,
                    updated_at = excluded.updated_at,
                    definition = excluded.definition
            `)
            .run(
                summary.id,
                summary.name,
                summary.description ?? null,
                summary.nodeCount,
                summary.connectionCount,
                summary.updatedAt!,
                JSON.stringify(saved)
            );
        return summary;
    }

    async remove(id: string): Promise<boolean> {
        const result = this.database().prepare('DELETE FROM workflows WHERE id = ?').run(id);
        return Number(result.changes) > 0;
    }

    async clear(): Promise<void> {
        this.database().prepare('DELETE FROM workflows').run();
    }

    close(): void {
        this.db?.close();
        this.db = undefined;
    }

    protected database(): SqliteDatabase {
        if (this.db) {
            return this.db;
        }
        const sqlite = loadSqlite();
        if (!sqlite?.DatabaseSync) {
            throw new Error('SQLite is not available in this Node runtime; use InMemoryWorkflowDefinitionStore or upgrade Node.');
        }
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        const db = new sqlite.DatabaseSync(this.file);
        db.exec(`
            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                node_count INTEGER NOT NULL DEFAULT 0,
                connection_count INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                definition TEXT NOT NULL
            )
        `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at DESC)');
        this.db = db;
        return db;
    }
}

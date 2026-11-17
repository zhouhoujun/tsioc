import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { token } from '@tsdi/ioc';
import { noReact } from '@tsdi/components';
import {
    createSqliteDatabase,
    defaultWorkflowDatabaseFile,
    isSqliteAvailable,
    SqliteDatabase
} from './SqliteWorkflowDefinitionStore';

/** Secret values stored outside workflow definitions. */
export interface WorkflowCredentialStore {
    set(name: string, value: string): Promise<void>;
    get(name: string): Promise<string | undefined>;
    list(): Promise<string[]>;
    remove(name: string): Promise<boolean>;
    close?(): void;
}

export const WORKFLOW_CREDENTIAL_STORE = token<WorkflowCredentialStore>('WORKFLOW_CREDENTIAL_STORE');

function credentialKey(key?: string): Buffer {
    const raw = key || (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env?.WORKFLOW_CREDENTIAL_KEY;
    if (!raw) {
        throw new Error(
            'Credentials require WORKFLOW_CREDENTIAL_KEY (or the credentialKey option). '
            + 'Use a 64-character hex key or any passphrase.'
        );
    }
    return /^[0-9a-f]{64}$/i.test(raw)
        ? Buffer.from(raw, 'hex')
        : createHash('sha256').update(raw).digest();
}

function encrypt(value: string, key: Buffer): { data: string; iv: string; tag: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return {
        data: data.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64')
    };
}

function decrypt(data: string, iv: string, tag: string, key: Buffer): string {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64')),
        decipher.final()
    ]).toString('utf8');
}

/** Credentials for tests and in-memory servers (process-local only). */
export class InMemoryWorkflowCredentialStore implements WorkflowCredentialStore {
    [noReact] = true;
    private readonly values = new Map<string, string>();

    async set(name: string, value: string): Promise<void> {
        this.values.set(String(name), String(value));
    }

    async get(name: string): Promise<string | undefined> {
        return this.values.get(String(name));
    }

    async list(): Promise<string[]> {
        return [...this.values.keys()];
    }

    async remove(name: string): Promise<boolean> {
        return this.values.delete(String(name));
    }
}

export interface SqliteWorkflowCredentialStoreOptions {
    file?: string;
    /** Encryption key; defaults to WORKFLOW_CREDENTIAL_KEY. */
    key?: string;
}

interface CredentialRow {
    name: string;
    data: string;
    iv: string;
    tag: string;
}

/** Encrypted credential storage in its own SQLite table. */
export class SqliteWorkflowCredentialStore implements WorkflowCredentialStore {
    [noReact] = true;
    private readonly file: string;
    private readonly key: Buffer;
    private db?: SqliteDatabase;

    constructor(options: SqliteWorkflowCredentialStoreOptions = {}) {
        this.file = options.file || defaultWorkflowDatabaseFile();
        this.key = credentialKey(options.key);
    }

    async set(name: string, value: string): Promise<void> {
        const encrypted = encrypt(String(value), this.key);
        this.database().prepare(`
            INSERT INTO workflow_credentials (name, data, iv, tag, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                data = excluded.data,
                iv = excluded.iv,
                tag = excluded.tag,
                updated_at = excluded.updated_at
        `).run(String(name), encrypted.data, encrypted.iv, encrypted.tag, Date.now());
    }

    async get(name: string): Promise<string | undefined> {
        const row = this.database()
            .prepare('SELECT name, data, iv, tag FROM workflow_credentials WHERE name = ?')
            .get(String(name)) as unknown as CredentialRow | undefined;
        if (!row) {
            return undefined;
        }
        try {
            return decrypt(row.data, row.iv, row.tag, this.key);
        } catch {
            throw new Error(`Credential could not be decrypted: ${name}. Check WORKFLOW_CREDENTIAL_KEY.`);
        }
    }

    async list(): Promise<string[]> {
        const rows = this.database()
            .prepare('SELECT name FROM workflow_credentials ORDER BY name')
            .all() as unknown as Array<{ name: string }>;
        return rows.map(row => row.name);
    }

    async remove(name: string): Promise<boolean> {
        const result = this.database()
            .prepare('DELETE FROM workflow_credentials WHERE name = ?')
            .run(String(name));
        return Number(result.changes) > 0;
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
            throw new Error('SQLite is not available in this Node runtime; use InMemoryWorkflowCredentialStore or upgrade Node.');
        }
        const db = createSqliteDatabase(this.file);
        db.exec(`
            CREATE TABLE IF NOT EXISTS workflow_credentials (
                name TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                iv TEXT NOT NULL,
                tag TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `);
        this.db = db;
        return db;
    }
}

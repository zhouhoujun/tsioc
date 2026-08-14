import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { token } from '@tsdi/ioc';
import { McpOAuthToken } from './types';

export interface McpStoredCredential {
    serverId: string;
    token: McpOAuthToken;
    updatedAt: number;
}

export interface CredentialStoreStatus {
    backend: string;
    encrypted: boolean;
    fallback: boolean;
    warning?: string;
}

/** Synchronous encryption boundary implemented by Electron safeStorage or the Node fallback. */
export interface CredentialEncryptionBackend {
    readonly status: CredentialStoreStatus;
    encrypt(value: string): string;
    decrypt(value: string): string;
}

export const CREDENTIAL_ENCRYPTION_BACKEND = token<CredentialEncryptionBackend>('CREDENTIAL_ENCRYPTION_BACKEND');

interface EncryptedCredentialStoreFile {
    version: 2;
    backend: string;
    credentials: Record<string, string>;
}

interface LegacyCredentialStoreFile {
    version: 1;
    credentials: Record<string, McpStoredCredential>;
}

/** Adapter for Electron's safeStorage without importing Electron into agent-tools. */
export class SafeStorageCredentialBackend implements CredentialEncryptionBackend {
    readonly status: CredentialStoreStatus;

    constructor(private readonly safeStorage: { isEncryptionAvailable(): boolean; encryptString(value: string): Buffer; decryptString(value: Buffer): string }) {
        const available = safeStorage.isEncryptionAvailable();
        this.status = {
            backend: 'electron-safe-storage', encrypted: available, fallback: false,
            ...(!available ? { warning: 'Electron safeStorage encryption is unavailable.' } : {})
        };
    }

    encrypt(value: string): string {
        if (!this.status.encrypted) throw new Error(this.status.warning);
        return this.safeStorage.encryptString(value).toString('base64');
    }

    decrypt(value: string): string {
        if (!this.status.encrypted) throw new Error(this.status.warning);
        return this.safeStorage.decryptString(Buffer.from(value, 'base64'));
    }
}

/** Pure Node fallback using a private local key and authenticated AES-256-GCM. */
export class LocalAesCredentialBackend implements CredentialEncryptionBackend {
    readonly status: CredentialStoreStatus = {
        backend: 'local-aes-256-gcm', encrypted: true, fallback: true,
        warning: 'OS credential encryption is unavailable; using a local key protected by file permissions.'
    };

    constructor(private readonly keyPath: string) {}

    encrypt(value: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key(), iv);
        const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64')).join('.');
    }

    decrypt(value: string): string {
        const parts = value.split('.').map(part => Buffer.from(part, 'base64'));
        if (parts.length !== 3 || parts[0].length !== 12 || parts[1].length !== 16) throw new Error('Invalid encrypted credential payload.');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key(), parts[0]);
        decipher.setAuthTag(parts[1]);
        return Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString('utf8');
    }

    private key(): Buffer {
        if (fs.existsSync(this.keyPath)) {
            const value = Buffer.from(fs.readFileSync(this.keyPath, 'utf8').trim(), 'base64');
            if (value.length !== 32) throw new Error(`Invalid credential key '${this.keyPath}'.`);
            this.chmodPrivate(this.keyPath);
            return value;
        }
        const value = crypto.randomBytes(32);
        fs.mkdirSync(path.dirname(this.keyPath), { recursive: true, mode: 0o700 });
        fs.writeFileSync(this.keyPath, value.toString('base64') + '\n', { encoding: 'utf8', mode: 0o600 });
        this.chmodPrivate(this.keyPath);
        return value;
    }

    private chmodPrivate(target: string): void {
        if (process.platform !== 'win32') fs.chmodSync(target, 0o600);
    }
}

/** File-backed encrypted OAuth credential store for remote MCP servers. */
export class McpOAuthCredentialStore {
    private readonly backend: CredentialEncryptionBackend;

    constructor(private readonly filePath?: string, backend?: CredentialEncryptionBackend) {
        this.backend = backend ?? new LocalAesCredentialBackend(`${this.getPath()}.key`);
    }

    getPath(): string {
        return this.filePath?.trim() || `${process.env.HOME || process.cwd()}/.tsdi-agent/mcp-credentials.json`;
    }

    getStatus(): CredentialStoreStatus { return { ...this.backend.status }; }
    get(serverId: string): McpStoredCredential | undefined { return this.read()[serverId]; }
    has(serverId: string): boolean { return !!this.get(serverId); }
    list(): McpStoredCredential[] { return Object.values(this.read()); }

    set(serverId: string, token: McpOAuthToken): void {
        const credentials = this.read();
        credentials[serverId] = { serverId, token, updatedAt: Date.now() };
        this.write(credentials);
    }

    delete(serverId: string): boolean {
        const credentials = this.read();
        if (!credentials[serverId]) return false;
        delete credentials[serverId];
        this.write(credentials);
        return true;
    }

    private read(): Record<string, McpStoredCredential> {
        const target = this.getPath();
        if (!fs.existsSync(target)) return {};
        try {
            const raw = fs.readFileSync(target, 'utf8').trim();
            if (!raw) return {};
            const parsed = JSON.parse(raw) as EncryptedCredentialStoreFile | LegacyCredentialStoreFile;
            if (parsed.version === 1 && parsed.credentials && typeof parsed.credentials === 'object') return parsed.credentials;
            if (parsed.version !== 2 || !parsed.credentials || typeof parsed.credentials !== 'object') return {};
            return Object.fromEntries(Object.entries(parsed.credentials).map(([id, encrypted]) => {
                const credential = JSON.parse(this.backend.decrypt(encrypted)) as McpStoredCredential;
                return [id, credential];
            }));
        } catch (err) {
            throw new Error(`Failed to read MCP credential store '${target}': ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private write(credentials: Record<string, McpStoredCredential>): void {
        const target = this.getPath();
        const file: EncryptedCredentialStoreFile = {
            version: 2,
            backend: this.backend.status.backend,
            credentials: Object.fromEntries(Object.entries(credentials).map(([id, credential]) => [id, this.backend.encrypt(JSON.stringify(credential))]))
        };
        fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
        fs.writeFileSync(target, JSON.stringify(file, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
        if (process.platform !== 'win32') fs.chmodSync(target, 0o600);
    }
}

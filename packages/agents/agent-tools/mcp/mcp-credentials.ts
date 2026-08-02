import * as fs from 'fs';
import * as path from 'path';
import { McpOAuthToken } from './types';

export interface McpStoredCredential {
    serverId: string;
    token: McpOAuthToken;
    updatedAt: number;
}

export interface McpCredentialStoreFile {
    version: 1;
    credentials: Record<string, McpStoredCredential>;
}

/**
 * File-backed OAuth credential store for remote MCP servers.
 *
 * Persists per-server OAuth tokens so `StreamableHttpMcpClient` can re-attach
 * across processes without re-authorizing on every run. Credentials are stored
 * as plain JSON at the configured path (defaults to `<agent-root>/mcp-credentials.json`).
 */
export class McpOAuthCredentialStore {
    constructor(
        private readonly filePath?: string
    ) {
    }

    getPath(): string {
        return this.filePath?.trim() || `${process.env.HOME || process.cwd()}/.tsdi-agent/mcp-credentials.json`;
    }

    get(serverId: string): McpStoredCredential | undefined {
        const file = this.read();
        return file.credentials[serverId];
    }

    has(serverId: string): boolean {
        return !!this.get(serverId);
    }

    list(): McpStoredCredential[] {
        return Object.values(this.read().credentials);
    }

    set(serverId: string, token: McpOAuthToken): void {
        const file = this.read();
        file.credentials[serverId] = {
            serverId,
            token,
            updatedAt: Date.now()
        };
        this.write(file);
    }

    delete(serverId: string): boolean {
        const file = this.read();
        if (!file.credentials[serverId]) {
            return false;
        }
        delete file.credentials[serverId];
        this.write(file);
        return true;
    }

    private read(): McpCredentialStoreFile {
        const target = this.getPath();
        if (!fs.existsSync(target)) {
            return { version: 1, credentials: {} };
        }
        try {
            const raw = fs.readFileSync(target, 'utf8').trim();
            if (!raw) {
                return { version: 1, credentials: {} };
            }
            const parsed = JSON.parse(raw) as Partial<McpCredentialStoreFile>;
            if (!parsed || typeof parsed !== 'object' || !parsed.credentials || typeof parsed.credentials !== 'object') {
                return { version: 1, credentials: {} };
            }
            return {
                version: 1,
                credentials: parsed.credentials
            };
        } catch (err) {
            throw new Error(`Failed to read MCP credential store '${target}': ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private write(file: McpCredentialStoreFile): void {
        const target = this.getPath();
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, JSON.stringify(file, null, 2) + '\n', 'utf8');
    }
}

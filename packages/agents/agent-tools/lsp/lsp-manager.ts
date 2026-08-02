import * as path from 'path';
import { LspClient } from './lsp-client';
import { LspClientOptions, LspServerOptions } from './types';

/**
 * Lazily launches one LSP client per server configuration, resolved by file
 * extension. Servers are only spawned on first use and disposed together.
 */
export class LspServerManager {
    private clients = new Map<string, LspClient>();

    constructor(private options: LspClientOptions) {
    }

    serverForExtension(extension: string): LspServerOptions | undefined {
        const key = this.normalizeExtension(extension);
        return this.options.servers?.[key];
    }

    extensionForPath(filePath: string): string {
        return path.extname(filePath).toLowerCase();
    }

    async clientFor(filePath: string): Promise<{ client: LspClient; extension: string } | null> {
        const extension = this.extensionForPath(filePath);
        const server = this.serverForExtension(extension);
        if (!server) {
            return null;
        }
        const existing = this.clients.get(extension);
        if (existing) {
            return { client: existing, extension };
        }
        const client = new LspClient(server, {
            servers: this.options.servers,
            timeoutMs: this.options.timeoutMs,
            clientInfo: this.options.clientInfo
        });
        this.clients.set(extension, client);
        return { client, extension };
    }

    hasServerFor(filePath: string): boolean {
        return this.serverForExtension(this.extensionForPath(filePath)) !== undefined;
    }

    async dispose(): Promise<void> {
        await Promise.all(Array.from(this.clients.values()).map(client => client.close().catch(() => undefined)));
        this.clients.clear();
    }

    private normalizeExtension(extension: string): string {
        const trimmed = extension.trim().toLowerCase();
        return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
    }
}

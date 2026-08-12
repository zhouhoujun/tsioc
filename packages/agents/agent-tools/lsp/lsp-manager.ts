import * as path from 'path';
import { LspClient } from './lsp-client';
import { LspInstallManager } from './lsp-install';
import { LspClientOptions, LspServerOptions } from './types';

/**
 * Lazily launches one LSP client per server configuration, resolved by file
 * extension. Servers are only spawned on first use and disposed together.
 * Missing server binaries are detected up front: with `autoInstall: true`
 * the install commands run automatically, otherwise a hint is recorded and
 * exposed through `installHintFor()`.
 */
export class LspServerManager {
    private clients = new Map<string, LspClient>();
    private missingHints = new Map<string, string>();

    constructor(
        private options: LspClientOptions,
        private install: LspInstallManager = new LspInstallManager()
    ) {
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
        const availability = await this.install.ensureAvailable(server, extension, this.options.autoInstall);
        if (!availability.available) {
            this.missingHints.set(extension, availability.hint ?? `No install command for '${server.command}'.`);
            return null;
        }
        if (availability.installed) {
            this.missingHints.delete(extension);
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

    installHintFor(extension: string): string | undefined {
        return this.missingHints.get(this.normalizeExtension(extension));
    }

    async dispose(): Promise<void> {
        await Promise.all(Array.from(this.clients.values()).map(client => client.close().catch(() => undefined)));
        this.clients.clear();
        this.missingHints.clear();
    }

    private normalizeExtension(extension: string): string {
        const trimmed = extension.trim().toLowerCase();
        return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
    }
}

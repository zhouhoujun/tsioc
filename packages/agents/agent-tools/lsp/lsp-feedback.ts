import { promises as fs } from 'fs';
import { AgentToolsOptions } from '../src/options';
import { LspDiagnostic } from './types';
import { resolveLspManager, toFileUri } from './lsp.tools';

export interface LspDiagnosticSummary {
    message: string;
    severity?: number;
    code?: string | number;
    source?: string;
    startLine?: number;
    startCharacter?: number;
    endLine?: number;
    endCharacter?: number;
}

const MAX_MESSAGE_LENGTH = 300;

function summarize(diagnostics: LspDiagnostic[], maxDiagnostics: number): LspDiagnosticSummary[] {
    return diagnostics.slice(0, maxDiagnostics).map(diagnostic => ({
        message: diagnostic.message.length > MAX_MESSAGE_LENGTH
            ? `${diagnostic.message.slice(0, MAX_MESSAGE_LENGTH)}...`
            : diagnostic.message,
        severity: diagnostic.severity,
        code: diagnostic.code,
        source: diagnostic.source,
        startLine: diagnostic.range?.start?.line,
        startCharacter: diagnostic.range?.start?.character,
        endLine: diagnostic.range?.end?.line,
        endCharacter: diagnostic.range?.end?.character
    }));
}

/**
 * Collect LSP diagnostics for a file after it was written. Re-reads the file
 * from disk, syncs it to the server (didOpen/didChange full sync), then pulls
 * diagnostics. Never throws: returns undefined when disabled, no server is
 * configured for the extension, or the server cannot answer.
 */
export async function collectLspDiagnostics(
    options: AgentToolsOptions | undefined,
    filePath: string,
    maxDiagnostics = 20
): Promise<LspDiagnosticSummary[] | undefined> {
    try {
        const setting = options?.lsp?.diagnosticsOnEdit;
        if (setting === false) {
            return undefined;
        }
        if (setting !== true) {
            const servers = options?.lsp?.servers;
            if (!servers || Object.keys(servers).length === 0) {
                return undefined;
            }
        }
        const manager = resolveLspManager(options);
        const server = await manager.clientFor(filePath);
        if (!server) {
            return undefined;
        }
        const content = await fs.readFile(filePath, 'utf8');
        const uri = toFileUri(filePath);
        await server.client.didChange(uri, content);
        const capabilities = await server.client.ensureInitialized();
        const diagnostics = capabilities.diagnosticProvider
            ? await server.client.pullDiagnostics(uri)
            : server.client.getDiagnostics(uri);
        return summarize(diagnostics, maxDiagnostics);
    } catch {
        return undefined;
    }
}

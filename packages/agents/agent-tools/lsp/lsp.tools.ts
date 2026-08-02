import * as path from 'path';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { LspServerManager } from './lsp-manager';

const lspManagers = new Map<object, LspServerManager>();

function resolveLspManager(options?: AgentToolsOptions): LspServerManager {
    const key = (options ?? {}) as object;
    let manager = lspManagers.get(key);
    if (!manager) {
        const lsp = options?.lsp ?? {};
        manager = new LspServerManager({
            servers: lsp.servers,
            timeoutMs: lsp.timeoutMs,
            clientInfo: { name: 'tsdi-agent', version: '6.0.0' }
        });
        lspManagers.set(key, manager);
    }
    return manager;
}

function toFileUri(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.startsWith('file://') ? normalized : `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

function toRelativePath(uri: string, baseDir?: string): string {
    const filePath = uri.replace(/^file:\/\//, '');
    if (baseDir) {
        const relative = path.relative(baseDir, filePath);
        if (!relative.startsWith('..')) {
            return relative;
        }
    }
    return filePath;
}

function unavailable(extension: string): any {
    return {
        available: false,
        extension,
        message: `No LSP server configured for '${extension}' files. Add one via agentTools({ lsp: { servers: { '${extension}': { command: '...' } } } }).`
    };
}

/**
 * Dispose every cached LSP server manager (closing all spawned servers).
 * Intended for shutdown/test teardown.
 */
export async function disposeLspManagers(): Promise<void> {
    const managers = Array.from(lspManagers.values());
    lspManagers.clear();
    await Promise.all(managers.map(manager => manager.dispose().catch(() => undefined)));
}

interface LspToolContext {
    filePath: string;
    line: number;
    character: number;
    includeDeclaration?: boolean;
}

function parsePositionInput(input: any): LspToolContext | { error: string } {
    const filePath = typeof input?.filePath === 'string' && input.filePath.trim() ? input.filePath.trim() : '';
    if (!filePath) {
        return { error: 'Invalid input: filePath is required.' };
    }
    const line = typeof input?.line === 'number' && input.line >= 0 ? Math.floor(input.line) : 0;
    const character = typeof input?.character === 'number' && input.character >= 0 ? Math.floor(input.character) : 0;
    return { filePath, line, character, includeDeclaration: input?.includeDeclaration === true };
}

function requireFilePath(input: any): string | { error: string } {
    const filePath = typeof input?.filePath === 'string' && input.filePath.trim() ? input.filePath.trim() : '';
    if (!filePath) {
        return { error: 'Invalid input: filePath is required.' };
    }
    return filePath;
}

function summarizeLocations(locations: any[], baseDir?: string): any[] {
    return locations.map(location => ({
        uri: location.uri,
        path: toRelativePath(location.uri, baseDir),
        startLine: location.range?.start?.line,
        startCharacter: location.range?.start?.character,
        endLine: location.range?.end?.line,
        endCharacter: location.range?.end?.character
    }));
}

@Injectable()
export class LspDefinitionTool implements AgentTool {
    name = 'lsp_definition';
    description = 'Resolve the definition location of the symbol at a position in a file via the Language Server Protocol.';
    inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string' },
            line: { type: 'number' },
            character: { type: 'number' }
        },
        required: ['filePath']
    };
    toolset = 'lsp';
    source = 'local';
    execution = {
        readOnly: true,
        timeoutMs: 30000,
        retryPolicy: { maxRetries: 1, delayMs: 100 }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS) private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const parsed = parsePositionInput(input);
        if ('error' in parsed) {
            throw new Error(parsed.error);
        }
        const manager = resolveLspManager(this.options);
        const uri = toFileUri(parsed.filePath);
        const server = await manager.clientFor(parsed.filePath);
        if (!server) {
            return unavailable(manager.extensionForPath(parsed.filePath));
        }
        const locations = await server.client.definition(uri, { line: parsed.line, character: parsed.character });
        return {
            available: true,
            filePath: parsed.filePath,
            locationCount: locations.length,
            locations: summarizeLocations(locations, context.workspace)
        };
    }
}

@Injectable()
export class LspReferencesTool implements AgentTool {
    name = 'lsp_references';
    description = 'Find all references to the symbol at a position in a file via the Language Server Protocol.';
    inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string' },
            line: { type: 'number' },
            character: { type: 'number' },
            includeDeclaration: { type: 'boolean' }
        },
        required: ['filePath']
    };
    toolset = 'lsp';
    source = 'local';
    execution = {
        readOnly: true,
        timeoutMs: 30000,
        retryPolicy: { maxRetries: 1, delayMs: 100 }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS) private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const parsed = parsePositionInput(input);
        if ('error' in parsed) {
            throw new Error(parsed.error);
        }
        const manager = resolveLspManager(this.options);
        const uri = toFileUri(parsed.filePath);
        const server = await manager.clientFor(parsed.filePath);
        if (!server) {
            return unavailable(manager.extensionForPath(parsed.filePath));
        }
        const locations = await server.client.references(uri, { line: parsed.line, character: parsed.character }, parsed.includeDeclaration);
        return {
            available: true,
            filePath: parsed.filePath,
            referenceCount: locations.length,
            references: summarizeLocations(locations, context.workspace)
        };
    }
}

@Injectable()
export class LspDiagnosticsTool implements AgentTool {
    name = 'lsp_diagnostics';
    description = 'Return the diagnostics (errors/warnings) reported for a file via the Language Server Protocol.';
    inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string' }
        },
        required: ['filePath']
    };
    toolset = 'lsp';
    source = 'local';
    execution = {
        readOnly: true,
        timeoutMs: 30000,
        retryPolicy: { maxRetries: 1, delayMs: 100 }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS) private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const filePath = requireFilePath(input);
        if (typeof filePath === 'object') {
            throw new Error(filePath.error);
        }
        const manager = resolveLspManager(this.options);
        const uri = toFileUri(filePath);
        const server = await manager.clientFor(filePath);
        if (!server) {
            return unavailable(manager.extensionForPath(filePath));
        }
        const capabilities = await server.client.ensureInitialized();
        let diagnostics = capabilities.diagnosticProvider
            ? await server.client.pullDiagnostics(uri)
            : server.client.getDiagnostics(uri);
        return {
            available: true,
            filePath,
            diagnosticCount: diagnostics.length,
            diagnostics: diagnostics.map(diagnostic => ({
                message: diagnostic.message,
                severity: diagnostic.severity,
                source: diagnostic.source,
                code: diagnostic.code,
                startLine: diagnostic.range?.start?.line,
                startCharacter: diagnostic.range?.start?.character,
                endLine: diagnostic.range?.end?.line,
                endCharacter: diagnostic.range?.end?.character
            }))
        };
    }
}

@Injectable()
export class LspSymbolsTool implements AgentTool {
    name = 'lsp_symbols';
    description = 'List the document symbols (classes, functions, variables) in a file via the Language Server Protocol.';
    inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string' }
        },
        required: ['filePath']
    };
    toolset = 'lsp';
    source = 'local';
    execution = {
        readOnly: true,
        timeoutMs: 30000,
        retryPolicy: { maxRetries: 1, delayMs: 100 }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS) private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const filePath = requireFilePath(input);
        if (typeof filePath === 'object') {
            throw new Error(filePath.error);
        }
        const manager = resolveLspManager(this.options);
        const uri = toFileUri(filePath);
        const server = await manager.clientFor(filePath);
        if (!server) {
            return unavailable(manager.extensionForPath(filePath));
        }
        const result = await server.client.documentSymbols(uri);
        return {
            available: true,
            filePath,
            symbolCount: result.symbols.length,
            symbols: result.symbols.map(symbol => ({
                name: symbol.name,
                kind: symbol.kind,
                detail: symbol.detail,
                startLine: symbol.range?.start?.line,
                endLine: symbol.range?.end?.line
            }))
        };
    }
}

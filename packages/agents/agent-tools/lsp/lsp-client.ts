import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import {
    LspCapabilities,
    LspClientInfo,
    LspClientOptions,
    LspDiagnostic,
    LspDocumentSymbolResult,
    LspLocation,
    LspPosition,
    LspRequestParams,
    LspServerOptions,
    LspSymbol
} from './types';

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timer?: NodeJS.Timeout;
}

/**
 * Minimal Language Server Protocol client over stdio. Speaks JSON-RPC 2.0
 * with Content-Length framing, performs the initialize/initialized handshake,
 * tracks the server's capabilities, and caches textDocument/publishDiagnostics
 * notifications per document URI.
 */
export class LspClient {
    private process?: ChildProcessWithoutNullStreams;
    private started = false;
    private closed = false;
    private requestId = 1;
    private buffer = Buffer.alloc(0);
    private pending = new Map<number, PendingRequest>();
    private initializedPromise?: Promise<LspCapabilities>;
    private capabilities: LspCapabilities = {
        definitionProvider: false,
        referencesProvider: false,
        documentSymbolProvider: false,
        diagnosticProvider: false
    };
    private diagnosticsByUri = new Map<string, LspDiagnostic[]>();

    constructor(
        private server: LspServerOptions,
        private options: LspClientOptions
    ) {
    }

    get isClosed(): boolean {
        return this.closed;
    }

    async ensureInitialized(): Promise<LspCapabilities> {
        if (this.initializedPromise) {
            return this.initializedPromise;
        }
        this.initializedPromise = (async () => {
            this.ensureStarted();
            const rootUri = this.toFileUri(this.server.rootDir || process.cwd());
            const result = await this.request<any>('initialize', {
                processId: process.pid,
                rootUri,
                rootPath: this.server.rootDir || process.cwd(),
                capabilities: {},
                clientInfo: this.clientInfo(),
                workspaceFolders: null
            });
            this.capabilities = this.resolveCapabilities(result?.capabilities);
            this.notify('initialized', {});
            return this.capabilities;
        })().catch(err => {
            this.initializedPromise = undefined;
            throw err;
        });
        return this.initializedPromise;
    }

    getCapabilities(): LspCapabilities {
        return this.capabilities;
    }

    getDiagnostics(uri: string): LspDiagnostic[] {
        return this.diagnosticsByUri.get(uri) ?? [];
    }

    async definition(uri: string, position: LspPosition): Promise<LspLocation[]> {
        await this.ensureInitialized();
        const result = await this.request<any>('textDocument/definition', {
            textDocument: { uri },
            position
        });
        return this.normalizeLocations(result);
    }

    async references(uri: string, position: LspPosition, includeDeclaration = false): Promise<LspLocation[]> {
        await this.ensureInitialized();
        const result = await this.request<any>('textDocument/references', {
            textDocument: { uri },
            position,
            context: { includeDeclaration }
        });
        return this.normalizeLocations(result);
    }

    async pullDiagnostics(uri: string): Promise<LspDiagnostic[]> {
        await this.ensureInitialized();
        const result = await this.request<any>('textDocument/diagnostic', {
            textDocument: { uri },
            previousResultId: this.previousResultIdByUri.get(uri)
        });
        if (result?.resultId) {
            this.previousResultIdByUri.set(uri, result.resultId);
        }
        const items = Array.isArray(result?.items) ? result.items : [];
        this.diagnosticsByUri.set(uri, items);
        return items;
    }

    async documentSymbols(uri: string): Promise<LspDocumentSymbolResult> {
        await this.ensureInitialized();
        const result = await this.request<any>('textDocument/documentSymbol', {
            textDocument: { uri }
        });
        return { uri, symbols: this.normalizeSymbols(result) };
    }

    async close(): Promise<void> {
        this.closed = true;
        this.initializedPromise = undefined;
        const error = new Error('LSP server closed.');
        this.pending.forEach(entry => {
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            entry.reject(error);
        });
        this.pending.clear();
        if (this.process && !this.process.killed) {
            this.write({ jsonrpc: '2.0', method: 'shutdown' });
            this.write({ jsonrpc: '2.0', method: 'exit' });
            const process = this.process;
            setTimeout(() => {
                if (!process.killed) {
                    process.kill();
                }
            }, 500);
        }
        this.process = undefined;
        this.started = false;
        this.buffer = Buffer.alloc(0);
    }

    private previousResultIdByUri = new Map<string, string>();

    private ensureStarted(): void {
        if (this.started) {
            return;
        }
        this.process = spawn(this.server.command, this.server.args ?? [], {
            cwd: this.server.cwd ?? this.server.rootDir,
            env: { ...process.env, ...(this.server.env ?? {}) },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.process.stdout.on('data', chunk => this.onData(chunk));
        this.process.stderr.on('data', () => undefined);
        this.process.on('error', err => this.failAll(err));
        this.process.on('exit', (code, signal) => {
            this.failAll(new Error(`LSP server exited (${code ?? 'null'}${signal ? `, ${signal}` : ''}).`));
            this.process = undefined;
            this.started = false;
        });
        this.started = true;
        this.closed = false;
    }

    private onData(chunk: Buffer): void {
        try {
            this.buffer = Buffer.concat([this.buffer, chunk] as Uint8Array[]);
            while (true) {
                const headerEnd = this.buffer.indexOf('\r\n\r\n');
                if (headerEnd < 0) {
                    return;
                }
                const headerText = this.buffer.subarray(0, headerEnd).toString('utf8');
                const contentLength = this.readContentLength(headerText);
                const frameEnd = headerEnd + 4 + contentLength;
                if (this.buffer.length < frameEnd) {
                    return;
                }
                const body = this.buffer.subarray(headerEnd + 4, frameEnd).toString('utf8');
                this.buffer = this.buffer.subarray(frameEnd);
                this.onMessage(JSON.parse(body));
            }
        } catch (err) {
            this.failAll(err instanceof Error ? err : new Error('Invalid LSP response.'));
        }
    }

    private onMessage(message: any): void {
        if (typeof message.id === 'number') {
            const pending = this.pending.get(message.id);
            if (!pending) {
                return;
            }
            this.pending.delete(message.id);
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
            if (message.error) {
                pending.reject(new Error(message.error.message || 'LSP request failed.'));
                return;
            }
            pending.resolve(message.result);
            return;
        }
        if (message.method === 'textDocument/publishDiagnostics' && message.params?.uri) {
            this.diagnosticsByUri.set(message.params.uri, Array.isArray(message.params.diagnostics) ? message.params.diagnostics : []);
        }
    }

    private readContentLength(headers: string): number {
        const match = /Content-Length:\s*(\d+)/i.exec(headers);
        if (!match) {
            throw new Error('Invalid LSP response: missing Content-Length header.');
        }
        return Number(match[1]);
    }

    private notify(method: string, params?: Record<string, any>): void {
        this.write({ jsonrpc: '2.0', method, params });
    }

    private async request<T = any>(method: string, params?: any): Promise<T> {
        this.ensureStarted();
        const id = this.requestId++;
        const timeoutMs = this.server.timeoutMs ?? this.options.timeoutMs ?? 15000;
        const result = new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                this.initializedPromise = undefined;
                reject(new Error(`LSP request '${method}' timed out.`));
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
        });
        this.write({ jsonrpc: '2.0', id, method, params });
        return result;
    }

    private write(message: Record<string, any>): void {
        if (!this.process?.stdin) {
            throw new Error('LSP server is not running.');
        }
        const body = Buffer.from(JSON.stringify(message), 'utf8');
        const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
        this.process.stdin.write(Buffer.concat([header, body] as Uint8Array[]));
    }

    private failAll(error: Error): void {
        this.pending.forEach(entry => {
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            entry.reject(error);
        });
        this.pending.clear();
        this.initializedPromise = undefined;
    }

    private clientInfo(): LspClientInfo {
        const info = this.options.clientInfo ?? { name: 'tsdi-agent', version: '6.0.0' };
        return { name: info.name, version: info.version ?? '0.0.0' };
    }

    private resolveCapabilities(capabilities: any): LspCapabilities {
        return {
            definitionProvider: !!capabilities?.definitionProvider,
            referencesProvider: !!capabilities?.referencesProvider,
            documentSymbolProvider: !!capabilities?.documentSymbolProvider,
            diagnosticProvider: !!capabilities?.diagnosticProvider
        };
    }

    private normalizeLocations(result: any): LspLocation[] {
        if (!result) {
            return [];
        }
        if (Array.isArray(result)) {
            return result.map(item => this.normalizeLocation(item)).filter((item): item is LspLocation => !!item);
        }
        const single = this.normalizeLocation(result);
        return single ? [single] : [];
    }

    private normalizeLocation(item: any): LspLocation | null {
        if (!item?.uri || !item?.range) {
            return null;
        }
        return {
            uri: String(item.uri),
            range: {
                start: { line: item.range.start?.line ?? 0, character: item.range.start?.character ?? 0 },
                end: { line: item.range.end?.line ?? 0, character: item.range.end?.character ?? 0 }
            }
        };
    }

    private normalizeSymbols(result: any): LspSymbol[] {
        if (!Array.isArray(result)) {
            return [];
        }
        return result.map(item => this.normalizeSymbol(item)).filter((item): item is LspSymbol => !!item);
    }

    private normalizeSymbol(item: any): LspSymbol | null {
        if (!item?.name || !item?.range) {
            return null;
        }
        return {
            name: String(item.name),
            kind: Number(item.kind ?? 0),
            range: {
                start: { line: item.range.start?.line ?? 0, character: item.range.start?.character ?? 0 },
                end: { line: item.range.end?.line ?? 0, character: item.range.end?.character ?? 0 }
            },
            selectionRange: item.selectionRange
                ? {
                    start: { line: item.selectionRange.start?.line ?? 0, character: item.selectionRange.start?.character ?? 0 },
                    end: { line: item.selectionRange.end?.line ?? 0, character: item.selectionRange.end?.character ?? 0 }
                }
                : undefined,
            detail: item.detail,
            children: Array.isArray(item.children) ? (item.children as any[]).map((child: any) => this.normalizeSymbol(child)).filter((child: any): child is LspSymbol => !!child) : undefined
        };
    }

    private toFileUri(rootDir: string): string {
        const resolved = rootDir.replace(/\\/g, '/');
        return resolved.startsWith('file://') ? resolved : `file://${resolved.startsWith('/') ? '' : '/'}${resolved}`;
    }
}

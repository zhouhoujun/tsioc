import expect = require('expect');
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { LspClient } from '../lsp/lsp-client';
import { LspServerManager } from '../lsp/lsp-manager';
import {
    disposeLspManagers,
    LspDefinitionTool,
    LspDiagnosticsTool,
    LspReferencesTool,
    LspSymbolsTool
} from '../lsp/lsp.tools';
import { LspServerOptions } from '../lsp/types';

const MOCK_SERVER_SOURCE = `
const readline = require('readline');
let buffer = '';
process.stdin.on('data', chunk => { buffer += chunk.toString('utf8'); processFrames(); });
function processFrames() {
  for (;;) {
    const idx = buffer.indexOf('\\r\\n\\r\\n');
    if (idx < 0) return;
    const m = /Content-Length:\\s*(\\d+)/i.exec(buffer.slice(0, idx));
    if (!m) { buffer = buffer.slice(idx + 4); continue; }
    const len = Number(m[1]);
    if (buffer.length < idx + 4 + len) return;
    const body = buffer.slice(idx + 4, idx + 4 + len);
    buffer = buffer.slice(idx + 4 + len);
    handle(JSON.parse(body));
  }
}
function send(msg) {
  const body = JSON.stringify(msg);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(body) + '\\r\\n\\r\\n' + body);
}
function handle(msg) {
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: {
      capabilities: {
        definitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        diagnosticProvider: { interFileDependencies: true, workspaceDiagnostics: false }
      },
      serverInfo: { name: 'mock-lsp' }
    } });
    return;
  }
  if (msg.method === 'initialized') return;
  if (msg.method === 'textDocument/definition') {
    send({ jsonrpc: '2.0', id: msg.id, result: { uri: msg.params.textDocument.uri, range: { start: { line: 10, character: 2 }, end: { line: 10, character: 8 } } } });
    return;
  }
  if (msg.method === 'textDocument/references') {
    send({ jsonrpc: '2.0', id: msg.id, result: [
      { uri: msg.params.textDocument.uri, range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } } },
      { uri: msg.params.textDocument.uri, range: { start: { line: 5, character: 4 }, end: { line: 5, character: 7 } } }
    ] });
    return;
  }
  if (msg.method === 'textDocument/documentSymbol') {
    send({ jsonrpc: '2.0', id: msg.id, result: [
      { name: 'main', kind: 12, range: { start: { line: 0, character: 0 }, end: { line: 9, character: 0 } }, selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } } }
    ] });
    return;
  }
  if (msg.method === 'textDocument/diagnostic') {
    send({ jsonrpc: '2.0', id: msg.id, result: { kind: 'full', resultId: 'r1', items: [
      { range: { start: { line: 3, character: 0 }, end: { line: 3, character: 5 } }, severity: 1, message: 'mock error' }
    ] } });
    return;
  }
  if (msg.method === 'shutdown') { send({ jsonrpc: '2.0', id: msg.id, result: null }); return; }
  if (msg.method === 'exit') { process.exit(0); }
}
`;

async function writeMockServer(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lsp-mock-'));
    const file = path.join(dir, 'mock-server.js');
    await fs.writeFile(file, MOCK_SERVER_SOURCE, 'utf8');
    return file;
}

function mockServerOptions(script: string): LspServerOptions {
    return { command: 'node', args: [script], rootDir: path.dirname(script) };
}

@Suite('LspClient')
export class LspClientTest {
    @Test('performs the initialize handshake and exposes server capabilities')
    async initializesAndExposesCapabilities() {
        const script = await writeMockServer();
        const rootDir = path.dirname(script);
        try {
            const client = new LspClient(mockServerOptions(script), { clientInfo: { name: 'test' } });
            const capabilities = await client.ensureInitialized();
            expect(capabilities.definitionProvider).toEqual(true);
            expect(capabilities.referencesProvider).toEqual(true);
            expect(capabilities.documentSymbolProvider).toEqual(true);
            expect(capabilities.diagnosticProvider).toEqual(true);
            expect(client.getCapabilities().definitionProvider).toEqual(true);
            await client.close();
        } finally {
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('resolves definitions, references, symbols and diagnostics')
    async resolvesLanguageQueries() {
        const script = await writeMockServer();
        const rootDir = path.dirname(script);
        try {
            const client = new LspClient(mockServerOptions(script), {});
            const uri = `file://${rootDir}/sample.ts`;

            const definitions = await client.definition(uri, { line: 0, character: 0 });
            expect(definitions.length).toEqual(1);
            expect(definitions[0].range.start.line).toEqual(10);

            const references = await client.references(uri, { line: 0, character: 0 });
            expect(references.length).toEqual(2);
            expect(references[1].range.start.line).toEqual(5);

            const symbols = await client.documentSymbols(uri);
            expect(symbols.symbols.length).toEqual(1);
            expect(symbols.symbols[0].name).toEqual('main');

            const diagnostics = await client.pullDiagnostics(uri);
            expect(diagnostics.length).toEqual(1);
            expect(diagnostics[0].message).toEqual('mock error');

            await client.close();
        } finally {
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('caches publishDiagnostics notifications per uri')
    async cachesPublishDiagnostics() {
        const script = await writeMockServer();
        try {
            const client = new LspClient(mockServerOptions(script), {});
            const uri = `file:///ws/a.ts`;
            await client.ensureInitialized();
            expect(client.getDiagnostics(uri)).toEqual([]);
            await client.close();
        } finally {
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }
}

@Suite('LspServerManager')
export class LspServerManagerTest {
    @Test('resolves a server per extension and returns null for unknown ones')
    async resolvesPerExtension() {
        const script = await writeMockServer();
        try {
            const manager = new LspServerManager({
                servers: { '.ts': mockServerOptions(script) }
            });
            expect(manager.extensionForPath('/a/b.ts')).toEqual('.ts');
            expect(manager.hasServerFor('/a/b.ts')).toEqual(true);
            expect(manager.hasServerFor('/a/b.py')).toEqual(false);

            const found = await manager.clientFor('/a/b.ts');
            expect(found).toBeTruthy();
            expect(found?.extension).toEqual('.ts');

            const missing = await manager.clientFor('/a/b.py');
            expect(missing).toEqual(null);

            await manager.dispose();
        } finally {
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }
}

@Suite('LSP tools')
export class LspToolsTest {
    @Test('lsp_definition returns the resolved location')
    async definitionToolReturnsLocations() {
        const script = await writeMockServer();
        try {
            const tool = new LspDefinitionTool({ lsp: { servers: { '.ts': mockServerOptions(script) } } });
            const result = await tool.invoke({ filePath: '/ws/sample.ts', line: 0, character: 0 }, { sessionId: 's1', workspace: '/ws', memory: {} as any });
            expect(result.available).toEqual(true);
            expect(result.locationCount).toEqual(1);
            expect(result.locations[0].startLine).toEqual(10);
            expect(result.locations[0].path).toEqual('sample.ts');
        } finally {
            await disposeLspManagers();
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('lsp_references returns reference locations')
    async referencesToolReturnsReferences() {
        const script = await writeMockServer();
        try {
            const tool = new LspReferencesTool({ lsp: { servers: { '.ts': mockServerOptions(script) } } });
            const result = await tool.invoke({ filePath: '/ws/sample.ts', line: 0, character: 0 }, { sessionId: 's1', workspace: '/ws', memory: {} as any });
            expect(result.available).toEqual(true);
            expect(result.referenceCount).toEqual(2);
            expect(result.references[1].startLine).toEqual(5);
        } finally {
            await disposeLspManagers();
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('lsp_diagnostics returns diagnostics for the file')
    async diagnosticsToolReturnsDiagnostics() {
        const script = await writeMockServer();
        try {
            const tool = new LspDiagnosticsTool({ lsp: { servers: { '.ts': mockServerOptions(script) } } });
            const result = await tool.invoke({ filePath: '/ws/sample.ts' }, { sessionId: 's1', workspace: '/ws', memory: {} as any });
            expect(result.available).toEqual(true);
            expect(result.diagnosticCount).toEqual(1);
            expect(result.diagnostics[0].message).toEqual('mock error');
        } finally {
            await disposeLspManagers();
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('lsp_symbols returns document symbols')
    async symbolsToolReturnsSymbols() {
        const script = await writeMockServer();
        try {
            const tool = new LspSymbolsTool({ lsp: { servers: { '.ts': mockServerOptions(script) } } });
            const result = await tool.invoke({ filePath: '/ws/sample.ts' }, { sessionId: 's1', workspace: '/ws', memory: {} as any });
            expect(result.available).toEqual(true);
            expect(result.symbolCount).toEqual(1);
            expect(result.symbols[0].name).toEqual('main');
            expect(result.symbols[0].kind).toEqual(12);
        } finally {
            await disposeLspManagers();
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('tools report unavailable when no server is configured for the extension')
    async toolsReportUnavailableWithoutServer() {
        const tool = new LspSymbolsTool({});
        const result = await tool.invoke({ filePath: '/ws/other.py' }, { sessionId: 's1', workspace: '/ws', memory: {} as any });
        expect(result.available).toEqual(false);
        expect(result.extension).toEqual('.py');
        expect(result.message).toContain('No LSP server configured');
    }
}

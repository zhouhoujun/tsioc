import { RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import { Buffer } from 'buffer';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { LspClient } from '../lsp/lsp-client';
import { LspInstallManager } from '../lsp/lsp-install';
import { LspServerManager } from '../lsp/lsp-manager';
import { collectLspDiagnostics } from '../lsp/lsp-feedback';
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

const MOCK_FEEDBACK_SERVER_SOURCE = `
const readline = require('readline');
let buffer = '';
let docs = {};
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
      capabilities: { definitionProvider: false, referencesProvider: false, documentSymbolProvider: false, diagnosticProvider: { interFileDependencies: true, workspaceDiagnostics: false } },
      serverInfo: { name: 'mock-feedback' }
    } });
    return;
  }
  if (msg.method === 'initialized') return;
  if (msg.method === 'textDocument/didOpen') {
    docs[msg.params.textDocument.uri] = msg.params.textDocument.text;
    return;
  }
  if (msg.method === 'textDocument/didChange') {
    const change = msg.params.contentChanges && msg.params.contentChanges.length ? msg.params.contentChanges[msg.params.contentChanges.length - 1] : null;
    if (change) docs[msg.params.textDocument.uri] = change.text;
    return;
  }
  if (msg.method === 'textDocument/diagnostic') {
    const content = docs[msg.params.textDocument.uri] || '';
    const items = content.indexOf('broken') >= 0
      ? [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } }, severity: 1, source: 'mock', message: 'mock broken error' }]
      : [];
    send({ jsonrpc: '2.0', id: msg.id, result: { kind: 'full', resultId: 'r1', items } });
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

async function writeFeedbackMockServer(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lsp-feedback-'));
    const file = path.join(dir, 'mock-server.js');
    await fs.writeFile(file, MOCK_FEEDBACK_SERVER_SOURCE, 'utf8');
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

    @Test('records an install hint when the server binary is missing')
    async installHintWhenServerMissing() {
        const manager = new LspServerManager(
            { servers: { '.ts': { command: 'typescript-language-server', args: ['--stdio'] } } },
            new LspInstallManager(async () => false, async () => { })
        );
        const found = await manager.clientFor('/a/b.ts');
        expect(found).toEqual(null);
        expect(manager.installHintFor('.ts')).toContain('npm install -g');
        await manager.dispose();
    }

    @Test('auto-installs the server binary when enabled and spawns the client')
    async autoInstallsWhenEnabled() {
        let available = false;
        const installed: string[][] = [];
        const manager = new LspServerManager(
            { servers: { '.ts': { command: 'typescript-language-server', args: ['--stdio'] } }, autoInstall: true },
            new LspInstallManager(async () => available, async commands => { installed.push(commands); available = true; })
        );
        const found = await manager.clientFor('/a/b.ts');
        expect(found).toBeTruthy();
        expect(installed.length).toEqual(1);
        expect(installed[0]).toEqual(['npm', 'install', '-g', 'typescript-language-server']);
        expect(manager.installHintFor('.ts')).toBeUndefined();
        await manager.dispose();
    }

    @Test('uses an explicit server install command when auto-installing')
    async explicitInstallCommandUsed() {
        let available = false;
        const installed: string[][] = [];
        const manager = new LspServerManager(
            { servers: { '.ts': { command: 'custom-server', args: ['--stdio'], install: ['brew', 'install', 'custom-server'] } }, autoInstall: true },
            new LspInstallManager(async () => available, async commands => { installed.push(commands); available = true; })
        );
        const found = await manager.clientFor('/a/b.ts');
        expect(found).toBeTruthy();
        expect(installed).toEqual([['brew', 'install', 'custom-server']]);
        await manager.dispose();
    }
}

@Suite('LspInstallManager')
export class LspInstallManagerTest {
    @Test('resolves default install specs by extension and command')
    resolvesDefaultInstallSpecs() {
        const manager = new LspInstallManager();
        expect(manager.specForExtension('.ts')?.command).toEqual('typescript-language-server');
        expect(manager.specForExtension('py')?.command).toEqual('pyright-langserver');
        expect(manager.specForExtension('.unknown')).toBeUndefined();
        expect(manager.specForCommand('gopls')?.extension).toEqual('.go');
    }

    @Test('ensureAvailable returns available when the binary is present')
    async availableWhenBinaryPresent() {
        const manager = new LspInstallManager(async () => true, async () => { throw new Error('should not install'); });
        const outcome = await manager.ensureAvailable({ command: 'typescript-language-server' }, '.ts');
        expect(outcome.available).toEqual(true);
        expect(outcome.installed).toBeUndefined();
    }

    @Test('returns an install hint when the binary is missing and autoInstall is off')
    async hintWhenMissingWithoutAutoInstall() {
        const manager = new LspInstallManager(async () => false, async () => { throw new Error('should not install'); });
        const outcome = await manager.ensureAvailable({ command: 'typescript-language-server' }, '.ts');
        expect(outcome.available).toEqual(false);
        expect(outcome.hint).toContain('npm install -g typescript-language-server');
    }

    @Test('runs install commands when autoInstall is true and re-checks availability')
    async autoInstallsWhenEnabled() {
        let available = false;
        const installed: string[][] = [];
        const manager = new LspInstallManager(async () => available, async commands => { installed.push(commands); available = true; });
        const outcome = await manager.ensureAvailable({ command: 'typescript-language-server' }, '.ts', true);
        expect(installed.length).toEqual(1);
        expect(installed[0]).toEqual(['npm', 'install', '-g', 'typescript-language-server']);
        expect(outcome.available).toEqual(true);
        expect(outcome.installed).toEqual(true);
    }

    @Test('reports the install error when auto-installation fails')
    async installFailureReportsError() {
        const manager = new LspInstallManager(async () => false, async () => { throw new Error('permission denied'); });
        const outcome = await manager.ensureAvailable({ command: 'typescript-language-server' }, '.ts', true);
        expect(outcome.available).toEqual(false);
        expect(outcome.error).toContain('permission denied');
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

@Suite('LSP edit feedback')
export class LspEditFeedbackTest {
    private async writeSampleFile(script: string, content: string): Promise<string> {
        const filePath = path.join(path.dirname(script), 'sample.ts');
        await fs.writeFile(filePath, content, 'utf8');
        return filePath;
    }

    @Test('collectLspDiagnostics pushes the edited content and returns the server diagnostics')
    async collectsDiagnosticsAfterEdit() {
        const script = await writeFeedbackMockServer();
        try {
            const filePath = await this.writeSampleFile(script, 'const clean = 1;');
            const options = { lsp: { servers: { '.ts': mockServerOptions(script) } } };

            const diagnostics = await collectLspDiagnostics(options, filePath);

            expect(diagnostics).toBeDefined();
            expect(diagnostics!.length).toEqual(0);

            await fs.writeFile(filePath, 'const broken = 1;', 'utf8');
            const afterEdit = await collectLspDiagnostics(options, filePath);

            expect(afterEdit!.length).toEqual(1);
            expect(afterEdit![0].message).toEqual('mock broken error');
            expect(afterEdit![0].severity).toEqual(1);
        } finally {
            await disposeLspManagers();
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('collectLspDiagnostics returns undefined when diagnosticsOnEdit is disabled')
    async respectsDiagnosticsOnEditToggle() {
        const script = await writeFeedbackMockServer();
        try {
            const filePath = await this.writeSampleFile(script, 'const broken = 1;');
            const options = { lsp: { servers: { '.ts': mockServerOptions(script) }, diagnosticsOnEdit: false } };

            const diagnostics = await collectLspDiagnostics(options, filePath);

            expect(diagnostics).toBeUndefined();
        } finally {
            await disposeLspManagers();
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }

    @Test('collectLspDiagnostics returns undefined when no server is configured')
    async returnsUndefinedWithoutServer() {
        const diagnostics = await collectLspDiagnostics({}, '/ws/sample.ts');
        expect(diagnostics).toBeUndefined();
    }

    @Test('collectLspDiagnostics caps the diagnostics list')
    async capsDiagnosticsList() {
        const script = await writeFeedbackMockServer();
        try {
            const filePath = await this.writeSampleFile(script, 'const broken = 1;');
            const options = { lsp: { servers: { '.ts': mockServerOptions(script) } } };

            const diagnostics = await collectLspDiagnostics(options, filePath, 1);

            expect(diagnostics!.length).toEqual(1);
        } finally {
            await disposeLspManagers();
            await fs.rm(path.dirname(script), { recursive: true, force: true });
        }
    }
}

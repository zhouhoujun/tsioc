import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { McpConnectionStatus, StdioMcpClient, mergeAgentMcpOptions } from '../mcp';

// Spec-compliant MCP stdio server: messages are newline-delimited JSON
// (no LSP-style Content-Length frames).
const STDIO_SERVER_SCRIPT = String.raw`let buf = '';
let idle = null;
function resetIdle() {
  if (idle) clearTimeout(idle);
  idle = setTimeout(() => process.exit(2), 250);
}
resetIdle();
function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
process.stdin.on('data', (chunk) => {
  resetIdle();
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).replace(/\r$/, '');
    buf = buf.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (err) { continue; }
    if (msg.id == null) continue;
    let result;
    if (msg.method === 'initialize') {
      result = { protocolVersion: '2026-07-28', capabilities: {}, serverInfo: { name: 'mock-stdio', version: '1.0.0' } };
    } else if (msg.method === 'tools/list') {
      result = { tools: [{ name: 'echo', title: 'Echo', description: 'Echo input back.', inputSchema: { type: 'object', properties: { value: { type: 'string' } } } }] };
    } else if (msg.method === 'tools/call') {
      const value = msg.params && msg.params.arguments && msg.params.arguments.value;
      if (value === 'CRASH') {
        process.exit(1);
      }
      result = { content: [{ type: 'text', text: 'echo:' + (value || '') }] };
    } else {
      result = {};
    }
    respond(msg.id, result);
  }
});
`;

// Same newline protocol, but the server also emits stray debug noise on stdout
// (as tsx/nodemon-wrapped servers do). The client must skip non-JSON lines.
const STDIO_NOISY_SERVER_SCRIPT = String.raw`let buf = '';
let idle = null;
function resetIdle() {
  if (idle) clearTimeout(idle);
  idle = setTimeout(() => process.exit(2), 250);
}
resetIdle();
process.stdout.write('tsx debug: server booted\n');
process.stdin.on('data', (chunk) => {
  resetIdle();
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).replace(/\r$/, '');
    buf = buf.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (err) { continue; }
    if (msg.id == null) continue;
    let result;
    if (msg.method === 'initialize') {
      result = { protocolVersion: '2026-07-28', capabilities: {}, serverInfo: { name: 'mock-noisy', version: '1.0.0' } };
    } else if (msg.method === 'tools/list') {
      result = { tools: [{ name: 'echo', title: 'Echo', description: 'Echo.', inputSchema: { type: 'object' } }] };
    } else if (msg.method === 'tools/call') {
      result = { content: [{ type: 'text', text: 'echo:' + ((msg.params && msg.params.arguments && msg.params.arguments.value) || '') }] };
    } else {
      result = {};
    }
    process.stdout.write('debug: about to respond\n');
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
  }
});
`;

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-mcp-stdio-'));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForReconnect(client: StdioMcpClient, timeoutMs: number): Promise<McpConnectionStatus | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const status = client.getConnectionStatus();
        if (status && status.reconnectCount >= 1) {
            return status;
        }
        await sleep(25);
    }
    return client.getConnectionStatus();
}

@Suite('Agent MCP stdio transport')
export class AgentMcpStdioTest {

    @Test('StdioMcpClient reconnects and redelivers after the server process dies')
    async stdioClientReconnectsAfterServerProcessDies() {
        const tmp = createTmpDir();
        const scriptPath = `${tmp}/stdio-server.js`;
        fs.writeFileSync(scriptPath, STDIO_SERVER_SCRIPT);
        try {
            const client = new StdioMcpClient(
                {
                    id: 'stdio',
                    command: process.execPath,
                    args: [scriptPath],
                    reconnectBackoffBaseMs: 5,
                    reconnectMaxAttempts: 10
                },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            const tools = await client.listTools();
            expect(tools.map(tool => tool.name)).toEqual(['echo']);
            const first = await client.callTool('echo', { value: 'hello' });
            expect(first.content?.[0].text).toEqual('echo:hello');
            expect(client.getConnectionStatus()?.connected).toEqual(true);

            const status = await waitForReconnect(client, 4000);
            expect(status?.reconnectCount).toBeGreaterThanOrEqual(1);

            const recovered = await client.callTool('echo', { value: 'recovered' });
            expect(recovered.content?.[0].text).toEqual('echo:recovered');
            expect(client.getConnectionStatus()?.connected).toEqual(true);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('StdioMcpClient rejects in-flight requests when the process dies without autoReconnect')
    async stdioClientRejectsInFlightRequestsWithoutAutoReconnect() {
        const tmp = createTmpDir();
        const scriptPath = `${tmp}/stdio-server.js`;
        fs.writeFileSync(scriptPath, STDIO_SERVER_SCRIPT);
        try {
            const client = new StdioMcpClient(
                {
                    id: 'stdio',
                    command: process.execPath,
                    args: [scriptPath],
                    autoReconnect: false
                },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            await client.listTools();
            let error: Error | undefined;
            try {
                await client.callTool('echo', { value: 'CRASH' });
            } catch (err) {
                error = err as Error;
            }
            expect(error?.message).toContain('exited');
            expect(client.getConnectionStatus()?.connected).toEqual(false);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('StdioMcpClient skips stray non-JSON stdout lines from the server (reference-SDK parity)')
    async stdioClientToleratesStrayStdoutLines() {
        const tmp = createTmpDir();
        const scriptPath = `${tmp}/stdio-noisy-server.js`;
        fs.writeFileSync(scriptPath, STDIO_NOISY_SERVER_SCRIPT);
        try {
            const client = new StdioMcpClient(
                {
                    id: 'stdio-noisy',
                    command: process.execPath,
                    args: [scriptPath],
                    reconnectBackoffBaseMs: 5,
                    reconnectMaxAttempts: 3
                },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            const tools = await client.listTools();
            expect(tools.map(tool => tool.name)).toEqual(['echo']);
            const result = await client.callTool('echo', { value: 'noisy' });
            expect(result.content?.[0].text).toEqual('echo:noisy');
            expect(client.getConnectionStatus()?.connected).toEqual(true);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }
}

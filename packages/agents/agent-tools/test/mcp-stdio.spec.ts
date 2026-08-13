import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { StdioMcpClient, mergeAgentMcpOptions } from '../mcp';

const STDIO_SERVER_SCRIPT = String.raw`let buf = '';
let idle = null;
function resetIdle() {
  if (idle) clearTimeout(idle);
  idle = setTimeout(() => process.exit(2), 250);
}
resetIdle();
process.stdin.on('data', (chunk) => {
  resetIdle();
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\r\n\r\n')) >= 0) {
    const head = buf.slice(0, idx).toString();
    const m = /Content-Length:\s*(\d+)/i.exec(head);
    buf = buf.slice(idx + 4);
    if (!m) continue;
    const len = Number(m[1]);
    if (buf.length < len) break;
    const body = buf.slice(0, len).toString();
    buf = buf.slice(len);
    let msg;
    try { msg = JSON.parse(body); } catch (err) { continue; }
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
    const out = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result });
    process.stdout.write('Content-Length: ' + Buffer.byteLength(out) + '\r\n\r\n' + out);
  }
});
`;

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-mcp-stdio-'));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

            await sleep(450);
            const status = client.getConnectionStatus();
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
}

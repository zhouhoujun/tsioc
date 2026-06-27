import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter, Controller, Post, RequestBody } from '@tsdi/service';
import { useMcpTransport } from '../src/server';
import { LocalMcpClientRegistry, provideMcpTools } from '@tsdi/agent-tools';
import { McpClient, McpToolDescriptor, McpToolCallResult } from '@tsdi/agent-tools';
import * as http from 'node:http';
import expect = require('expect');

const PORT = 22500;

class HttpMcpClient implements McpClient {
    constructor(private baseUrl: string) {}

    private async send(method: string, params?: any): Promise<any> {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const body = JSON.stringify({ jsonrpc: '2.0', method, params, id });
        const u = new URL(this.baseUrl);
        return new Promise<any>((resolve, reject) => {
            const req = http.request({
                hostname: u.hostname, port: u.port ? parseInt(u.port) : PORT,
                path: '/', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            }, (res) => {
                let data = '';
                res.on('data', (chunk: Buffer) => data += chunk.toString());
                res.on('end', () => {
                    try {
                        const resp = JSON.parse(data);
                        if (resp.error) reject(new Error(resp.error.message || 'RPC failed'));
                        else resolve(resp.result);
                    } catch (e: any) { reject(new Error('Parse error: ' + e.message)); }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    async listTools(): Promise<McpToolDescriptor[]> {
        const result = await this.send('tools.list');
        return (result && result.tools) || [];
    }

    async callTool(name: string, args?: Record<string, any>): Promise<McpToolCallResult> {
        return this.send('tools.call', { name, arguments: args });
    }

    async close(): Promise<void> {}
}

@Controller('/')
class ToolsController {
    @Post('/tools/list')
    getTools() {
        return {
            tools: [
                { name: 'echo', description: 'Echo input', inputSchema: {
                    type: 'object', properties: { message: { type: 'string' } }, required: ['message']
                } },
                { name: 'add', description: 'Add numbers', inputSchema: {
                    type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b']
                } }
            ]
        };
    }

    @Post('/tools/call')
    callTool(@RequestBody() body: any) {
        const name = body?.name;
        const args = body?.arguments || {};
        if (name === 'echo') {
            return { content: [{ type: 'text', text: JSON.stringify(args.message ?? '') }] };
        }
        if (name === 'add') {
            return { content: [{ type: 'text', text: String((args.a ?? 0) + (args.b ?? 0)) }] };
        }
        return { isError: true, content: [{ type: 'text', text: 'Unknown tool: ' + name }] };
    }
}

@Module({
    imports: [LoggerModule],
    declarations: [ToolsController],
    providers: [
        provideService(useRouter(),
            useMcpTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })
        )
    ]
})
class MCPAgentE2eModule {}

describe('MCP + Agent Tools E2E', () => {
    let ctx: ApplicationContext;
    let httpClient: HttpMcpClient;

    before(async () => {
        ctx = await Application.run(MCPAgentE2eModule);
        httpClient = new HttpMcpClient(`http://127.0.0.1:${PORT}`);
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });

    it('should list tools via HTTP', async () => {
        const tools = await httpClient.listTools();
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBe(2);
        const names = tools.map((t: McpToolDescriptor) => t.name);
        expect(names).toContain('echo');
        expect(names).toContain('add');
    });

    it('should call echo tool via HTTP', async () => {
        const result = await httpClient.callTool('echo', { message: 'hello mcp' });
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content![0].text).toBe('"hello mcp"');
    });

    it('should add numbers via HTTP', async () => {
        const result = await httpClient.callTool('add', { a: 3, b: 7 });
        expect(result.content![0].text).toBe('10');
    });

    it('should report error via HTTP', async () => {
        const result = await httpClient.callTool('unknown', {});
        expect(result.isError).toBe(true);
        expect(result.content![0].text).toContain('Unknown tool');
    });

    it('should integrate with agent-tools registry', async () => {
        const client = new HttpMcpClient(`http://127.0.0.1:${PORT}`);

        const tools = await client.listTools();
        expect(tools.map((t: McpToolDescriptor) => t.name)).toEqual(['echo', 'add']);

        const result = await client.callTool('echo', { message: 'agent hello' });
        expect(result.content![0].text).toBe('"agent hello"');
    });
});

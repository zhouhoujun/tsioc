import * as http from 'node:http';
import expect = require('expect');
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter } from '@tsdi/service';
import { useMcpTransport, McpToolController } from '../src';
import { provideAgentMcpServerProvider } from '@tsdi/agent-tools';
import { McpClient, McpToolCallResult, McpToolDescriptor } from '@tsdi/agent-tools';

const PORT = 22610;

class FakeAgentMcpClient implements McpClient {
    private calls: Array<{ name: string; args?: Record<string, any> }> = [];

    async listTools(): Promise<McpToolDescriptor[]> {
        return [
            {
                name: 'echo',
                description: 'Echo input',
                inputSchema: {
                    type: 'object',
                    properties: { message: { type: 'string' } },
                    required: ['message']
                }
            },
            {
                name: 'sum',
                description: 'Sum two numbers',
                inputSchema: {
                    type: 'object',
                    properties: { a: { type: 'number' }, b: { type: 'number' } },
                    required: ['a', 'b']
                }
            }
        ];
    }

    async callTool(name: string, args?: Record<string, any>): Promise<McpToolCallResult> {
        this.calls.push({ name, args });
        if (name === 'echo') {
            return { content: [{ type: 'text', text: String(args?.message ?? '') }] };
        }
        if (name === 'sum') {
            return { content: [{ type: 'text', text: String((args?.a ?? 0) + (args?.b ?? 0)) }] };
        }
        return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }

    getCalls() {
        return this.calls.slice();
    }
}

const fakeClient = new FakeAgentMcpClient();

@Module({
    imports: [LoggerModule],
    declarations: [McpToolController],
    providers: [
        provideService(
            useRouter(),
            useMcpTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })
        ),
        ...provideAgentMcpServerProvider({
            servers: [{
                id: 'demo',
                client: fakeClient,
                tools: [
                    { name: 'echo', description: 'Echo input' },
                    { name: 'sum', description: 'Sum two numbers' }
                ]
            }]
        })
    ]
})
class AgentMcpServiceApp { }

interface JsonRpcResponse {
    jsonrpc: string;
    id: number | null;
    result?: any;
    error?: { code: number; message: string };
}

function rpc(method: string, params?: Record<string, any>, id = 1): Promise<JsonRpcResponse> {
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port: PORT,
            path: '/',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(body)
            }
        }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => text += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(text));
                } catch (err) {
                    reject(new Error(`Invalid JSON-RPC response: ${text}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

describe('Agent MCP service bridge', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(AgentMcpServiceApp);
    });

    after(async () => {
        await ctx?.close();
    });

    it('initializes as an MCP server backed by the agent MCP registry', async () => {
        const response = await rpc('initialize', {
            protocolVersion: '2026-07-28',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
        });
        expect(response.error).toBeUndefined();
        expect(response.result.protocolVersion).toBe('2026-07-28');
        expect(response.result.serverInfo.name).toBe('tsdi-agent-mcp-service');
    });

    it('lists tools from configured agent MCP servers', async () => {
        const response = await rpc('tools/list', {});
        expect(response.error).toBeUndefined();
        expect(response.result.tools.map((tool: McpToolDescriptor) => tool.name)).toEqual(['echo', 'sum']);
    });

    it('forwards tools/call to the matching agent MCP server', async () => {
        const response = await rpc('tools/call', { name: 'echo', arguments: { message: 'hello agent' } }, 2);
        expect(response.error).toBeUndefined();
        expect(response.result.content[0].text).toBe('hello agent');
        expect(fakeClient.getCalls()).toEqual([{ name: 'echo', args: { message: 'hello agent' } }]);
    });

    it('returns empty resources and prompts lists', async () => {
        const resources = await rpc('resources/list', {}, 3);
        expect(resources.result.resources).toEqual([]);
        const prompts = await rpc('prompts/list', {}, 4);
        expect(prompts.result.prompts).toEqual([]);
    });
});

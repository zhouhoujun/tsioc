import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AgentMcpServerOptions, LocalMcpClientRegistry, McpOAuthClient, McpOAuthCredentialStore, McpOAuthInteraction, StreamableHttpMcpClient, mergeAgentMcpOptions } from '../mcp';

interface CapturedRequest {
    method?: string;
    params?: any;
    id?: number;
    headers: http.IncomingHttpHeaders;
}

interface McpHttpServer {
    server: http.Server;
    port: number;
    requests: CapturedRequest[];
}

function startMcpServer(handler: (req: CapturedRequest, res: http.ServerResponse) => void): Promise<McpHttpServer> {
    return new Promise(resolve => {
        const requests: CapturedRequest[] = [];
        const server = http.createServer((req, res) => {
            let body = '';
            req.on('data', chunk => (body += chunk));
            req.on('end', () => {
                let parsed: any = {};
                if (body) {
                    try {
                        parsed = JSON.parse(body);
                    } catch (err) {
                        parsed = {};
                    }
                }
                const captured: CapturedRequest = {
                    method: parsed.method,
                    params: parsed.params,
                    id: parsed.id,
                    headers: req.headers
                };
                requests.push(captured);
                handler(captured, res);
            });
        });
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                server,
                port: typeof address === 'object' && address ? address.port : 0,
                requests
            });
        });
    });
}

function respondJson(res: http.ServerResponse, payload: any, status = 200, headers: Record<string, string> = {}): void {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(payload));
}

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-mcp-'));
}

function defaultMcpHandler(req: CapturedRequest, res: http.ServerResponse): void {
    if (req.method === 'initialize') {
        respondJson(res, {
            jsonrpc: '2.0',
            id: req.id,
            result: {
                protocolVersion: '2025-06-18',
                capabilities: { tools: {} },
                serverInfo: { name: 'mock', version: '1.0.0' }
            }
        }, 200, { 'mcp-session-id': 'sess-1' });
    } else if (req.method === 'notifications/initialized') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
    } else if (req.method === 'tools/list') {
        respondJson(res, {
            jsonrpc: '2.0',
            id: req.id,
            result: {
                tools: [{
                    name: 'echo',
                    title: 'Echo',
                    description: 'Echo input back.',
                    inputSchema: {
                        type: 'object',
                        properties: { value: { type: 'string' } }
                    }
                }]
            }
        });
    } else if (req.method === 'tools/call') {
        respondJson(res, {
            jsonrpc: '2.0',
            id: req.id,
            result: {
                content: [{ type: 'text', text: `echo:${req.params?.arguments?.value ?? ''}` }]
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'method not found' } }));
    }
}

class FakeMcpOAuthClient {
    private tokens = new Map<string, { accessToken: string; tokenType: string; }>();

    setToken(serverId: string, token: { accessToken: string; tokenType: string; }): void {
        this.tokens.set(serverId, token);
    }

    async getAccessToken(server: AgentMcpServerOptions): Promise<{ accessToken: string; tokenType: string; }> {
        const token = this.tokens.get(server.id);
        if (!token) {
            throw new Error(`No OAuth token for '${server.id}'.`);
        }
        return token;
    }
}

class RecordingInteraction implements McpOAuthInteraction {
    deviceCalls: Array<{ verificationUri: string; userCode?: string; }> = [];
    openCalls: string[] = [];

    async onDeviceAuthorization(verificationUri: string, userCode?: string): Promise<void> {
        this.deviceCalls.push({ verificationUri, userCode });
    }

    async openAuthorizationUrl(url: string): Promise<void> {
        this.openCalls.push(url);
    }
}

@Suite('Agent MCP streamable HTTP transport')
export class AgentMcpStreamableHttpTest {

    @Test('StreamableHttpMcpClient initializes, lists tools, and calls tools over HTTP JSON')
    async streamableHttpClientInitializesListsAndCallsTools() {
        const tmp = createTmpDir();
        const harness = await startMcpServer(defaultMcpHandler);
        try {
            const client = new StreamableHttpMcpClient(
                { id: 'remote', url: `http://127.0.0.1:${harness.port}/mcp` },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            const tools = await client.listTools();
            expect(tools.length).toEqual(1);
            expect(tools[0].name).toEqual('echo');
            const result = await client.callTool('echo', { value: 'hello' });
            expect(result.content?.[0].text).toEqual('echo:hello');
            expect(client.hasSession()).toEqual(true);
            expect(harness.requests.map(req => req.method)).toEqual([
                'initialize',
                'notifications/initialized',
                'tools/list',
                'tools/call'
            ]);
            const toolsList = harness.requests[2];
            expect(toolsList.headers['mcp-session-id']).toEqual('sess-1');
        } finally {
            harness.server.close();
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('StreamableHttpMcpClient parses text/event-stream responses')
    async streamableHttpClientParsesEventStreamResponses() {
        const tmp = createTmpDir();
        const harness = await startMcpServer((req, res) => {
            if (req.method === 'tools/list') {
                const payload = {
                    jsonrpc: '2.0',
                    id: req.id,
                    result: {
                        tools: [{ name: 'sse_tool', description: 'From SSE.' }]
                    }
                };
                res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                res.end(`data: ${JSON.stringify(payload)}\n\n`);
                return;
            }
            defaultMcpHandler(req, res);
        });
        try {
            const client = new StreamableHttpMcpClient(
                { id: 'sse', url: `http://127.0.0.1:${harness.port}/mcp` },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            const tools = await client.listTools();
            expect(tools.map(tool => tool.name)).toEqual(['sse_tool']);
        } finally {
            harness.server.close();
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('StreamableHttpMcpClient retries once with an OAuth token on 401')
    async streamableHttpClientRetriesOnceWithOAuthTokenOn401() {
        const tmp = createTmpDir();
        let initializeCalls = 0;
        const harness = await startMcpServer((req, res) => {
            if (req.method === 'initialize') {
                initializeCalls++;
                if (initializeCalls === 1) {
                    res.writeHead(401, {
                        'Content-Type': 'application/json',
                        'WWW-Authenticate': 'Bearer resource="mcp", scope="mcp.tools"'
                    });
                    res.end(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32001, message: 'unauthorized' } }));
                    return;
                }
            }
            defaultMcpHandler(req, res);
        });
        try {
            const oauth = new FakeMcpOAuthClient();
            oauth.setToken('secure', { accessToken: 'oauth-token', tokenType: 'Bearer' });
            const client = new StreamableHttpMcpClient(
                { id: 'secure', url: `http://127.0.0.1:${harness.port}/mcp` },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` }),
                oauth as unknown as McpOAuthClient
            );
            const tools = await client.listTools();
            expect(tools.length).toEqual(1);
            expect(initializeCalls).toEqual(2);
            const retried = harness.requests[0];
            expect(retried.headers.authorization).toBeUndefined();
            const second = harness.requests[1];
            expect(second.headers.authorization).toEqual('Bearer oauth-token');
        } finally {
            harness.server.close();
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('StreamableHttpMcpClient sends static bearer and custom headers')
    async streamableHttpClientSendsStaticBearerAndCustomHeaders() {
        const tmp = createTmpDir();
        const harness = await startMcpServer(defaultMcpHandler);
        try {
            const client = new StreamableHttpMcpClient(
                {
                    id: 'secure',
                    url: `http://127.0.0.1:${harness.port}/mcp`,
                    headers: { 'X-Custom': 'custom-value' },
                    auth: { type: 'bearer', bearerToken: 'static-token' }
                },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            await client.listTools();
            const initialize = harness.requests[0];
            expect(initialize.headers.authorization).toEqual('Bearer static-token');
            expect(initialize.headers['x-custom']).toEqual('custom-value');
        } finally {
            harness.server.close();
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('StreamableHttpMcpClient reports HTTP failures with status')
    async streamableHttpClientReportsHttpFailures() {
        const tmp = createTmpDir();
        const harness = await startMcpServer((req, res) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: 'boom' } }));
        });
        try {
            const client = new StreamableHttpMcpClient(
                { id: 'bad', url: `http://127.0.0.1:${harness.port}/mcp` },
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            let error: Error | undefined;
            try {
                await client.listTools();
            } catch (err) {
                error = err as Error;
            }
            expect(error?.message).toContain('500');
        } finally {
            harness.server.close();
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('LocalMcpClientRegistry selects StreamableHttpMcpClient for url servers')
    async localRegistrySelectsStreamableHttpClientForUrlServers() {
        const tmp = createTmpDir();
        const harness = await startMcpServer(defaultMcpHandler);
        try {
            const registry = new LocalMcpClientRegistry(mergeAgentMcpOptions({
                servers: [{ id: 'remote', url: `http://127.0.0.1:${harness.port}/mcp` }],
                credentialsPath: `${tmp}/creds.json`
            }));
            const tools = await registry.listServerTools('remote');
            expect(tools.map(tool => tool.name)).toEqual(['echo']);
            expect(harness.requests.some(req => req.method === 'tools/list')).toEqual(true);
        } finally {
            harness.server.close();
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('LocalMcpClientRegistry uses an explicitly provided client when present')
    async localRegistryUsesExplicitClientWhenPresent() {
        const tmp = createTmpDir();
        try {
            const calls: string[] = [];
            const fake = {
                async listTools() {
                    calls.push('listTools');
                    return [{ name: 'local', description: 'Local fake.' }];
                },
                async callTool(name: string) {
                    calls.push(`callTool:${name}`);
                    return { content: [{ type: 'text', text: 'ok' }] };
                }
            };
            const registry = new LocalMcpClientRegistry(mergeAgentMcpOptions({
                servers: [{ id: 'custom', client: fake as any }],
                credentialsPath: `${tmp}/creds.json`
            }));
            const tools = await registry.listServerTools('custom');
            expect(tools.map(tool => tool.name)).toEqual(['local']);
            expect(calls).toEqual(['listTools']);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('McpOAuthCredentialStore persists and removes credentials')
    async credentialStorePersistsAndRemovesCredentials() {
        const tmp = createTmpDir();
        try {
            const filePath = `${tmp}/mcp-credentials.json`;
            const store = new McpOAuthCredentialStore(filePath);
            expect(store.has('alpha')).toEqual(false);
            store.set('alpha', { accessToken: 'at-1', refreshToken: 'rt-1', tokenType: 'Bearer' });
            expect(store.has('alpha')).toEqual(true);
            expect(store.get('alpha')?.token.accessToken).toEqual('at-1');

            const reloaded = new McpOAuthCredentialStore(filePath);
            expect(reloaded.get('alpha')?.token.refreshToken).toEqual('rt-1');
            expect(reloaded.list().length).toEqual(1);

            expect(reloaded.delete('alpha')).toEqual(true);
            expect(reloaded.delete('alpha')).toEqual(false);
            expect(reloaded.has('alpha')).toEqual(false);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('McpOAuthClient discovers explicit authorization server endpoints without network')
    async oauthClientDiscoversExplicitEndpoints() {
        const tmp = createTmpDir();
        try {
            const oauth = new McpOAuthClient(
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            const metadata = await oauth.discover({
                id: 'remote',
                url: 'https://example.com/mcp',
                auth: {
                    type: 'oauth',
                    clientId: 'client-1',
                    tokenEndpoint: 'https://example.com/token',
                    authorizationEndpoint: 'https://example.com/authorize',
                    deviceAuthorizationEndpoint: 'https://example.com/device'
                }
            });
            expect(metadata.token_endpoint).toEqual('https://example.com/token');
            expect(metadata.authorization_endpoint).toEqual('https://example.com/authorize');
            expect(metadata.device_authorization_endpoint).toEqual('https://example.com/device');
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('McpOAuthClient refreshes an expired stored token and persists the new one')
    async oauthClientRefreshesExpiredStoredToken() {
        const tmp = createTmpDir();
        try {
            const oauth = new McpOAuthClient(
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` }),
                {
                    fetchImpl: (async (input: any) => ({
                        ok: true,
                        status: 200,
                        json: async () => ({
                            access_token: 'fresh-access',
                            refresh_token: 'fresh-refresh',
                            token_type: 'Bearer',
                            expires_in: 3600
                        })
                    })) as any
                }
            );
            const server: AgentMcpServerOptions = {
                id: 'remote',
                url: 'https://example.com/mcp',
                auth: {
                    type: 'oauth',
                    clientId: 'client-1',
                    tokenEndpoint: 'https://example.com/token',
                    authorizationEndpoint: 'https://example.com/authorize'
                }
            };
            oauth.getStore().set(server.id, {
                accessToken: 'expired-access',
                refreshToken: 'rt-1',
                tokenType: 'Bearer',
                expiresAt: Date.now() - 1000
            });
            const token = await oauth.getAccessToken(server);
            expect(token.accessToken).toEqual('fresh-access');
            expect(token.refreshToken).toEqual('fresh-refresh');
            expect(oauth.getStore().get(server.id)?.token.accessToken).toEqual('fresh-access');
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('McpOAuthClient completes a device flow and stores the token')
    async oauthClientCompletesDeviceFlow() {
        const tmp = createTmpDir();
        try {
            let pollCount = 0;
            const interaction = new RecordingInteraction();
            const oauth = new McpOAuthClient(
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` }),
                {
                    interaction,
                    fetchImpl: (async (input: any) => {
                        const url = String(input);
                        if (url.includes('/device')) {
                            return {
                                ok: true,
                                status: 200,
                                json: async () => ({
                                    device_code: 'device-1',
                                    user_code: 'CODE-1234',
                                    verification_uri: 'https://example.com/verify',
                                    interval: 0.01
                                })
                            };
                        }
                        pollCount++;
                        if (pollCount === 1) {
                            return {
                                ok: false,
                                status: 400,
                                json: async () => ({ error: 'authorization_pending' })
                            };
                        }
                        return {
                            ok: true,
                            status: 200,
                            json: async () => ({
                                access_token: 'device-access',
                                refresh_token: 'device-refresh',
                                token_type: 'Bearer',
                                expires_in: 3600
                            })
                        };
                    }) as any
                }
            );
            const server: AgentMcpServerOptions = {
                id: 'remote',
                url: 'https://example.com/mcp',
                auth: {
                    type: 'oauth',
                    clientId: 'client-1',
                    tokenEndpoint: 'https://example.com/token',
                    authorizationEndpoint: 'https://example.com/authorize',
                    deviceAuthorizationEndpoint: 'https://example.com/device'
                }
            };
            const ok = await oauth.authorizeAndStore(server);
            expect(ok).toEqual(true);
            expect(interaction.deviceCalls.length).toEqual(1);
            expect(interaction.deviceCalls[0].userCode).toEqual('CODE-1234');
            expect(oauth.getStore().get(server.id)?.token.accessToken).toEqual('device-access');
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    @Test('McpOAuthClient refuses bearer-configured servers in authorizeAndStore')
    async oauthClientRefusesBearerServers() {
        const tmp = createTmpDir();
        try {
            const oauth = new McpOAuthClient(
                mergeAgentMcpOptions({ credentialsPath: `${tmp}/creds.json` })
            );
            const ok = await oauth.authorizeAndStore({
                id: 'static',
                url: 'https://example.com/mcp',
                auth: { type: 'bearer', bearerToken: 'static' }
            });
            expect(ok).toEqual(false);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }
}

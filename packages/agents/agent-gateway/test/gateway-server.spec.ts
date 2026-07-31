import expect = require('expect');
import { PassThrough } from 'stream';
import { Suite, Test } from '@tsdi/unit';
import { HttpAuthService, JWTService } from '@tsdi/security';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { RouteMatcher } from '../src/gateway/RouteMatcher';
import { ChatWebSocket } from '../src/ws/ChatWebSocket';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';
import { StdioAppRpcServer } from '../src/app-rpc/StdioAppRpcServer';
import { AppRpcHandler } from '../src/api/AppRpcHandler';
import { RateLimiter } from '../src/auth/RateLimiter';
import { AuthMiddleware, getRequestPrincipalId, setRequestAuth } from '../src/auth/AuthMiddleware';
import { PairingStore } from '../src/auth/PairingStore';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { SessionHandler } from '../src/api/SessionHandler';
import { EventHandler } from '../src/api/EventHandler';
import { AuditHandler } from '../src/api/AuditHandler';
import { InMemorySessionStore, InMemoryMemoryStore, AgentTurnStartedEvent, AgentStreamChunkEvent, AgentToolInvokedEvent, AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolSkippedEvent, AgentTurnCompletedEvent, AgentErrorEvent, LocalToolRegistry } from '@tsdi/agent';
import { MemoryHandler } from '../src/api/MemoryHandler';
import { ToolsHandler } from '../src/api/ToolsHandler';
import { ReadFileTool } from '../../agent-tools/src';
import { AgentGatewayModule, provideAgentGateway } from '../src';

@Suite('RouteMatcher')
export class RouteMatcherTest {
    @Test('matches exact paths')
    matchExact() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/health', handler: async (_req: any, _res: any) => {} });
        const r = m.match('GET', '/health');
        expect(r).toBeTruthy();
        expect(r!.route.path).toBe('/health');
    }

    @Test('matches path parameters')
    matchParams() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/api/sessions/:id/messages', handler: async (_req: any, _res: any) => {} });
        const r = m.match('GET', '/api/sessions/abc123/messages');
        expect(r).toBeTruthy();
        expect(r!.params['id']).toBe('abc123');
    }

    @Test('returns null for unmatched paths')
    noMatch() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/health', handler: async (_req: any, _res: any) => {} });
        expect(m.match('GET', '/missing')).toBeNull();
    }

    @Test('matches method correctly')
    matchMethod() {
        const m = new RouteMatcher();
        m.add({ method: 'POST', path: '/api/memory', handler: async (_req: any, _res: any) => {} });
        expect(m.match('GET', '/api/memory')).toBeNull();
        expect(m.match('POST', '/api/memory')).toBeTruthy();
    }

    @Test('matches catch-all wildcard')
    matchWildcard() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/api/*', handler: async (_req: any, _res: any) => {} });
        const r = m.match('GET', '/api/tools');
        expect(r).toBeTruthy();
    }

    @Test('provideAgentGateway returns providers and module withOptions returns module metadata')
    gatewayProvidersShape() {
        const providers = provideAgentGateway();
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);

        const result = AgentGatewayModule.withOptions();
        expect(result.module).toBe(AgentGatewayModule);
        expect(Array.isArray(result.providers)).toBe(true);
        expect(result.providers?.length).toBeGreaterThan(0);
    }
}

@Suite('RateLimiter')
export class RateLimiterTest {
    @Test('allows requests within limit and blocks over limit')
    checkLimit() {
        const limiter = new RateLimiter();
        (limiter as any).config = { rateLimitMax: 2, rateLimitWindowMs: 60000 };

        expect(limiter.check('10.0.0.1')).toBe(true);
        expect(limiter.check('10.0.0.1')).toBe(true);
        expect(limiter.check('10.0.0.1')).toBe(false);

        expect(limiter.check('10.0.0.2')).toBe(true);
    }
}

@Suite('AuthMiddleware')
export class AuthMiddlewareTest {
    @Test('extracts Bearer token from Authorization header')
    extractToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = { authToken: 'secret' };

        const req = { headers: { authorization: 'Bearer secret' } } as any;
        expect(auth.extractToken(req)).toBe('secret');
    }

    @Test('extracts token from Sec-WebSocket-Protocol')
    extractWsToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        const req = { headers: { 'sec-websocket-protocol': 'bearer.ws-token' } } as any;
        expect(auth.extractToken(req)).toBe('ws-token');
    }

    @Test('extracts token from query parameter')
    extractQueryToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        const req = { headers: { host: 'localhost' }, url: '/ws/chat?token=query-token' } as any;
        expect(auth.extractToken(req)).toBe('query-token');
    }

    @Test('verifies token correctly')
    verifyToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = { authToken: 'my-token' };

        expect(auth.verify('my-token')).toBe(true);
        expect(auth.verify('wrong')).toBe(false);
        expect(auth.verify(null)).toBe(false);
    }

    @Test('returns null for missing auth header')
    missingToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        const req = { headers: {} } as any;
        expect(auth.extractToken(req)).toBeNull();
    }

    @Test('authenticate succeeds when auth is disabled')
    async authDisabled() {
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = { authToken: '' };

        const req = { headers: {} } as any;
        const res = { writeHead: () => res, end: () => {} } as any;
        expect(await auth.authenticate(req, res)).toBe(true);
    }

    @Test('shared http auth service verifies jwt tokens for gateway use')
    async verifyJwtThroughSharedService() {
        const jwtService = new JWTService();
        const httpAuth = new HttpAuthService(jwtService);
        const token = await jwtService.sign({ sub: 'gateway-user' }, { privateKey: 'secret-key' as any });
        const claims = await httpAuth.verifyJwtToken(token, {
            publicKey: 'secret-key' as any,
            algorithms: ['HS256']
        });
        expect(claims.sub).toBe('gateway-user');
    }

    @Test('auth middleware accepts valid jwt token')
    async authenticateJwt() {
        const jwtService = new JWTService();
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = {
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        };

        const token = await jwtService.sign({ sub: 'gateway-user' }, { privateKey: 'secret-key' as any });
        const req = { headers: { authorization: `Bearer ${token}` } } as any;
        const res = { writeHead: () => res, end: () => {} } as any;
        expect(await auth.authenticate(req, res)).toBe(true);
        expect(getRequestPrincipalId(req)).toBe('gateway-user');
    }
}

@Suite('GatewayServer JWT auth')
export class GatewayServerJwtAuthTest {
    @Test('accepts route request with valid jwt token')
    async acceptsJwtRequest() {
        const jwtService = new JWTService();
        const config = {
            cors: false,
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        } as any;
        const auth = new AuthMiddleware(new HttpAuthService(jwtService), config);
        const rateLimiter = { checkAndRespond: () => true } as any;
        const server = new GatewayServer(auth, rateLimiter, {} as any, config);
        let handled = false;
        server.addRoute({
            method: 'GET',
            path: '/health',
            handler: async (_req: any, res: any) => {
                handled = true;
                res.writeHead(200).end();
            }
        });

        const token = await jwtService.sign({ sub: 'gateway-user' }, { privateKey: 'secret-key' as any });
        const req = {
            method: 'GET',
            url: '/health',
            headers: { host: 'localhost', authorization: `Bearer ${token}` },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res,
            setHeader: () => {}
        } as any;

        await (server as any).handleRequest(req, res);
        expect(handled).toBe(true);
        expect(status).toBe(200);
    }

    @Test('rejects route request with invalid jwt token')
    async rejectsInvalidJwtRequest() {
        const config = {
            cors: false,
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        } as any;
        const auth = new AuthMiddleware(new HttpAuthService(), config);
        const rateLimiter = { checkAndRespond: () => true } as any;
        const server = new GatewayServer(auth, rateLimiter, {} as any, config);
        let handled = false;
        server.addRoute({
            method: 'GET',
            path: '/health',
            handler: async () => {
                handled = true;
            }
        });

        const req = {
            method: 'GET',
            url: '/health',
            headers: { host: 'localhost', authorization: 'Bearer invalid-token' },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res,
            setHeader: () => {}
        } as any;

        await (server as any).handleRequest(req, res);
        expect(handled).toBe(false);
        expect(status).toBe(401);
    }
}

@Suite('SessionHandler')
export class SessionHandlerTest {
    @Test('lists tracked sessions with timestamps')
    async listsTrackedSessions() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const route = handler.getRoutes().find(route => route.path === '/api/sessions' && route.method === 'GET')!;
        let body = '';
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.length).toEqual(1);
        expect(data[0].id).toEqual('s1');
        expect(data[0].messageCount).toEqual(1);
        expect(data[0].createdAt).toBeTruthy();
        expect(data[0].lastActiveAt).toBeTruthy();
    }

    @Test('lists owned sessions grouped by workspace')
    async listsOwnedSessionsGroupedByWorkspace() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.setWorkspace('s1', '/tmp/project-a');
        await store.append('s2', { id: '2', role: 'user', content: 'two', createdAt: 2 });
        await store.setWorkspace('s2', '/tmp/project-a');
        await store.append('s3', { id: '3', role: 'user', content: 'three', createdAt: 3 });
        await store.setWorkspace('s3', '/tmp/project-b');
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-1');
        await owners.create('s3', 'user-2');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');
        handler.track('s2');
        handler.track('s3');

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/projects' && route.method === 'GET')!;
        let body = '';
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.length).toEqual(1);
        expect(data[0].workspace).toEqual('/tmp/project-a');
        expect(data[0].sessionCount).toEqual(2);
        expect(data[0].sessions.map((session: any) => session.id).sort()).toEqual(['s1', 's2']);
    }

    @Test('rejects deleting another principals session')
    async rejectsDeletingForeignSession() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.append('s2', { id: '2', role: 'user', content: 'two', createdAt: 2 });
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');
        handler.track('s2');

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/:id' && route.method === 'DELETE')!;
        let status = 0;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await route.handler(req, res, { id: 's2' });
        expect(status).toEqual(403);
        expect((await store.get('s1')).messages.length).toEqual(1);
        expect((await store.get('s2')).messages.length).toEqual(1);
    }

    @Test('deletes session without recreating empty owned record')
    async deletesSessionWithoutRecreatingRecord() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/:id' && route.method === 'DELETE')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: () => res
        } as any;

        await route.handler(req, res, { id: 's1' });
        expect(await store.has('s1')).toEqual(false);
    }

    @Test('lists persisted owned sessions without track call')
    async listsPersistedOwnedSessionsWithoutTrack() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);

        const route = handler.getRoutes().find(route => route.path === '/api/sessions' && route.method === 'GET')!;
        let body = '';
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.length).toEqual(1);
        expect(data[0].id).toEqual('s1');
    }

    @Test('lists only actively running sessions')
    async listsOnlyActivelyRunningSessions() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/running' && route.method === 'GET')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        let body = '';
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        expect(JSON.parse(body)).toEqual([]);

        handler.onTurnStarted({ sessionId: 's1' } as any);
        await route.handler(req, res, {} as any);
        expect(JSON.parse(body)).toEqual(['s1']);

        handler.onTurnCompleted({ sessionId: 's1' } as any);
        await route.handler(req, res, {} as any);
        expect(JSON.parse(body)).toEqual([]);
    }
}

@Suite('ToolsHandler')
export class ToolsHandlerTest {
    @Test('lists registered agent-tools definitions through api route')
    async listsRegisteredAgentTools() {
        const registry = new LocalToolRegistry([
            new ReadFileTool({ file: { rootDir: process.cwd() } })
        ], new InMemoryMemoryStore());
        const bundles = [{
            name: 'filesystem',
            description: 'Workspace file reading and search tools.',
            tools: ['read_file'],
            defaultEnabled: true,
            deferredActivation: true,
            enabled: true,
            source: 'builtin',
            providerId: '@tsdi/agent-tools',
            activation: { kind: 'deferred', scope: 'session' },
            sessionScoped: true
        }];
        const handler = new ToolsHandler(registry, bundles as any);
        const route = handler.getRoutes().find(route => route.path === '/api/tools' && route.method === 'GET')!;
        let body = '';
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler({} as any, res, {} as any);
        const data = JSON.parse(body);
        expect(data.length).toEqual(1);
        expect(data[0].name).toEqual('read_file');
        expect(data[0].description).toBeTruthy();
        expect(data[0].toolset).toEqual('filesystem');
        expect(data[0].source).toEqual('local');
        expect(data[0].execution.readOnly).toEqual(true);
        expect(data[0].inputSchema.required).toEqual(['path']);
        expect(data[0].canonicalName).toEqual(null);
        expect(data[0].aliases).toEqual(null);
        expect(data[0].tags).toEqual(null);
        expect(data[0].activation).toEqual({ kind: 'deferred', scope: 'session', activated: false });
        expect(data[0].provenance).toEqual(null);

        const bundleRoute = handler.getRoutes().find(route => route.path === '/api/tool-bundles' && route.method === 'GET')!;
        body = '';
        await bundleRoute.handler({} as any, res, {} as any);
        const bundleData = JSON.parse(body);
        expect(bundleData).toEqual(bundles);
        expect(bundleData[0].source).toEqual('builtin');
        expect(bundleData[0].providerId).toEqual('@tsdi/agent-tools');
        expect(bundleData[0].activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(bundleData[0].sessionScoped).toEqual(true);
    }

    @Test('exposes rich tool metadata through api route when present')
    async exposesRichToolMetadata() {
        const registry = {
            getToolDefinitions() {
                return [{
                    name: 'mcp.demo.echo',
                    description: 'Echo from MCP.',
                    toolset: 'mcp:demo',
                    source: 'mcp',
                    execution: { readOnly: false, sideEffect: true, requiresSequential: true },
                    inputSchema: { type: 'object' },
                    canonicalName: 'echo',
                    aliases: ['demo.echo'],
                    tags: ['mcp', 'dynamic'],
                    activation: { kind: 'deferred', scope: 'session', activated: false },
                    provenance: {
                        origin: 'mcp',
                        providerId: '@tsdi/agent-tools/mcp',
                        serverId: 'demo',
                        sessionScoped: true
                    }
                }];
            }
        } as any;
        const handler = new ToolsHandler(registry, []);
        const route = handler.getRoutes().find(route => route.path === '/api/tools' && route.method === 'GET')!;
        let body = '';
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler({} as any, res, {} as any);
        const data = JSON.parse(body);
        expect(data).toEqual([{
            name: 'mcp.demo.echo',
            description: 'Echo from MCP.',
            toolset: 'mcp:demo',
            source: 'mcp',
            execution: { readOnly: false, sideEffect: true, requiresSequential: true },
            inputSchema: { type: 'object' },
            outputSchema: null,
            canonicalName: 'echo',
            aliases: ['demo.echo'],
            tags: ['mcp', 'dynamic'],
            activation: { kind: 'deferred', scope: 'session', activated: false },
            provenance: {
                origin: 'mcp',
                providerId: '@tsdi/agent-tools/mcp',
                serverId: 'demo',
                sessionScoped: true
            }
        }]);
    }

    @Test('discovers dynamic MCP tools through api route')
    async discoversDynamicMcpTools() {
        let invoked: any;
        const registry = {
            getToolDefinitions() {
                return [{
                    name: 'mcp.list_tools',
                    description: 'List tools exposed by a configured MCP server on demand.',
                    toolset: 'mcp',
                    source: 'mcp',
                    provenance: { origin: 'mcp', providerId: '@tsdi/agent-tools/mcp' }
                }, {
                    name: 'mcp.call_tool',
                    description: 'Call a tool from a configured MCP server by serverId and tool name.',
                    toolset: 'mcp',
                    source: 'mcp',
                    execution: { readOnly: false, sideEffect: true, requiresSequential: true },
                    provenance: { origin: 'mcp', providerId: '@tsdi/agent-tools/mcp' }
                }];
            },
            getToolDefinition(name: string) {
                return this.getToolDefinitions().find((tool: any) => tool.name === name);
            },
            async invoke(name: string, input: any, sessionId: string) {
                invoked = { name, input, sessionId };
                return {
                    serverId: 'demo',
                    tools: [{
                        name: 'echo',
                        fullName: 'mcp.demo.echo',
                        description: 'Echo from MCP.',
                        inputSchema: { type: 'object' },
                        toolset: 'mcp:demo',
                        source: 'mcp'
                    }]
                };
            }
        } as any;
        const handler = new ToolsHandler(registry, []);
        const route = handler.getRoutes().find(route => route.path === '/api/mcp/tools' && route.method === 'GET')!;
        let body = '';
        let status = 0;
        const req = { url: '/api/mcp/tools?serverId=demo' } as any;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(status).toEqual(200);
        expect(invoked).toEqual({
            name: 'mcp.list_tools',
            input: { serverId: 'demo' },
            sessionId: '__gateway__'
        });
        expect(data).toEqual([{
            name: 'mcp.demo.echo',
            description: 'Echo from MCP.',
            toolset: 'mcp:demo',
            source: 'mcp',
            execution: { readOnly: false, sideEffect: true, requiresSequential: true },
            inputSchema: { type: 'object' },
            outputSchema: null,
            canonicalName: 'echo',
            aliases: null,
            tags: ['mcp', 'demo'],
            activation: { kind: 'deferred', scope: 'session', activated: false },
            provenance: {
                origin: 'mcp',
                providerId: '@tsdi/agent-tools/mcp',
                serverId: 'demo',
                sessionScoped: true
            }
        }]);
    }

    @Test('rejects dynamic MCP discovery without server id')
    async rejectsDynamicMcpDiscoveryWithoutServerId() {
        const registry = {
            getToolDefinitions() {
                return [{ name: 'mcp.list_tools', description: 'List tools.', toolset: 'mcp', source: 'mcp' }];
            },
            getToolDefinition(name: string) {
                return this.getToolDefinitions().find((tool: any) => tool.name === name);
            }
        } as any;
        const handler = new ToolsHandler(registry, []);
        const route = handler.getRoutes().find(route => route.path === '/api/mcp/tools' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/mcp/tools' } as any;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any);
        expect(status).toEqual(400);
    }

    @Test('returns not found when MCP discovery is not configured')
    async returnsNotFoundWhenMcpDiscoveryIsNotConfigured() {
        const registry = {
            getToolDefinitions() {
                return [];
            },
            getToolDefinition() {
                return undefined;
            }
        } as any;
        const handler = new ToolsHandler(registry, []);
        const route = handler.getRoutes().find(route => route.path === '/api/mcp/tools' && route.method === 'GET')!;
        let status = 0;
        let body = '';
        const req = { url: '/api/mcp/tools?serverId=demo' } as any;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        expect(status).toEqual(404);
        expect(JSON.parse(body).error).toContain('not configured');
    }

    @Test('maps dynamic MCP discovery failures to non-500 responses')
    async mapsDynamicMcpDiscoveryFailuresToNon500Responses() {
        const registry = {
            getToolDefinitions() {
                return [{ name: 'mcp.list_tools', description: 'List tools.', toolset: 'mcp', source: 'mcp' }];
            },
            getToolDefinition(name: string) {
                return this.getToolDefinitions().find((tool: any) => tool.name === name);
            },
            async invoke() {
                throw new Error("MCP server 'demo' is not configured.");
            }
        } as any;
        const handler = new ToolsHandler(registry, []);
        const route = handler.getRoutes().find(route => route.path === '/api/mcp/tools' && route.method === 'GET')!;
        let status = 0;
        let body = '';
        const req = { url: '/api/mcp/tools?serverId=demo' } as any;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        expect(status).toEqual(404);
        expect(JSON.parse(body).error).toContain('not configured');
    }

    @Test('normalizes legacy tool metadata through api route')
    async normalizesLegacyToolMetadata() {
        const registry = {
            getToolDefinitions() {
                return [{
                    name: 'legacy',
                    description: 'legacy tool'
                }];
            }
        } as any;
        const handler = new ToolsHandler(registry, []);
        const route = handler.getRoutes().find(route => route.path === '/api/tools' && route.method === 'GET')!;
        let body = '';
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler({} as any, res, {} as any);
        const data = JSON.parse(body);
        expect(data).toEqual([{
            name: 'legacy',
            description: 'legacy tool',
            toolset: null,
            source: null,
            execution: null,
            inputSchema: null,
            outputSchema: null,
            canonicalName: null,
            aliases: null,
            tags: null,
            activation: null,
            provenance: null
        }]);

        const bundleRoute = handler.getRoutes().find(route => route.path === '/api/tool-bundles' && route.method === 'GET')!;
        body = '';
        await bundleRoute.handler({} as any, res, {} as any);
        const bundleData = JSON.parse(body);
        expect(bundleData).toEqual([]);
    }
}

@Suite('EventHandler')
export class EventHandlerTest {
    @Test('stores broadcast history and returns it from history route')
    async storesEventHistory() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new EventHandler(owners);
        handler.onTurnStarted(new AgentTurnStartedEvent(handler as any, 's1', 'hello'));
        handler.onStreamChunk(new AgentStreamChunkEvent(handler as any, 's1', 'text', 'hi'));
        handler.onToolInvoked(new AgentToolInvokedEvent(handler as any, 's1', 'echo', { value: 'x' }));
        handler.onToolCompleted(new AgentToolCompletedEvent(handler as any, 's1', 'echo', { ok: true }));
        handler.onToolFailed(new AgentToolFailedEvent(handler as any, 's1', 'echo', new Error('boom')));
        handler.onToolSkipped(new AgentToolSkippedEvent(handler as any, 's1', 'echo', 'skipped'));
        handler.onTurnCompleted(new AgentTurnCompletedEvent(handler as any, 's1', { id: '1', role: 'assistant', content: 'done', createdAt: 1 } as any));

        const route = handler.getRoutes().find(route => route.path === '/api/events/history' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/events/history?sessionId=s1' } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.events.length).toEqual(7);
        expect(data.events[0].type).toEqual('turn_started');
        expect(data.events[1].type).toEqual('stream_chunk');
        expect(data.events[4].type).toEqual('tool_failed');
        expect(data.events[5].type).toEqual('tool_skipped');
        expect(data.events[6].type).toEqual('turn_completed');
    }

    @Test('rejects event history access for another principal')
    async rejectsForeignHistory() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new EventHandler(owners);
        handler.onTurnStarted(new AgentTurnStartedEvent(handler as any, 's1', 'hello'));
        handler.onError(new AgentErrorEvent(handler as any, 's1', new Error('boom')));

        const route = handler.getRoutes().find(route => route.path === '/api/events/history' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/events/history?sessionId=s1' } as any;
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any);
        expect(status).toEqual(403);
    }
}

@Suite('ChatWebSocket')
export class ChatWebSocketTest {
    @Test('streams chunks then final message then done over websocket writer')
    async streamsChunksAndFinalMessage() {
        const writes: string[] = [];
        const runtime = {
            async *runStreamingTurn() {
                yield { type: 'text', content: 'hel' };
                yield { type: 'text', content: 'lo' };
                yield { type: 'done' };
            },
            async getMessages() {
                return [{ id: '1', role: 'assistant', content: 'hello', createdAt: 1 }];
            }
        } as any;
        const store = new InMemorySessionStore();
        const ws = new ChatWebSocket(runtime, new SessionOwnerStore(store), new (require('../src/auth/SessionQueue').SessionQueue)());
        const socket = {
            write: (buffer: Buffer) => {
                const payloadLength = buffer[1] & 0x7f;
                const offset = payloadLength < 126 ? 2 : 4;
                writes.push(buffer.subarray(offset).toString('utf8'));
                return true;
            }
        } as any;

        await (ws as any).handleMessage(socket, JSON.stringify({ content: 'hello' }), 's1');
        await new Promise(resolve => setTimeout(resolve, 0));

        const frames = writes.map(value => JSON.parse(value));
        expect(frames.map(frame => frame.type)).toEqual(['chunk', 'chunk', 'message', 'done']);
        expect(frames[0].content).toEqual('hel');
        expect(frames[1].content).toEqual('lo');
        expect(frames[2].content).toEqual('hello');
    }

    @Test('rejects resuming a foreign session id')
    async rejectsForeignSessionResume() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const ws = new ChatWebSocket({} as any, owners, {} as any);
        let status = 0;
        const req = { headers: { host: 'localhost' }, url: '/ws/chat?sessionId=s1' } as any;
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        const sessionId = await (ws as any).resolveSessionId(req, 'user-2', res);
        expect(sessionId).toBeNull();
        expect(status).toEqual(403);
    }

    @Test('rejects resuming an unowned session id')
    async rejectsUnownedSessionResume() {
        const store = new InMemorySessionStore();
        const ws = new ChatWebSocket({} as any, new SessionOwnerStore(store), {} as any);
        let status = 0;
        const req = { headers: { host: 'localhost' }, url: '/ws/chat?sessionId=legacy-session' } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        const sessionId = await (ws as any).resolveSessionId(req, 'user-1', res);
        expect(sessionId).toBeNull();
        expect(status).toEqual(403);
    }

    @Test('writes error frame when session queue rejects')
    async writesErrorFrameOnQueueReject() {
        const writes: string[] = [];
        const runtime = {
            async *runStreamingTurn() {
                yield { type: 'text', content: 'ignored' };
            },
            async getMessages() {
                return [];
            }
        } as any;
        const store = new InMemorySessionStore();
        const ws = new ChatWebSocket(runtime, new SessionOwnerStore(store), {
            enqueue: () => Promise.reject(new Error('session queue limit reached')),
            remove: () => undefined
        } as any);
        const socket = {
            write: (buffer: Buffer) => {
                const payloadLength = buffer[1] & 0x7f;
                const offset = payloadLength < 126 ? 2 : 4;
                writes.push(buffer.subarray(offset).toString('utf8'));
                return true;
            }
        } as any;

        await (ws as any).handleMessage(socket, JSON.stringify({ content: 'hello' }), 's1');
        await new Promise(resolve => setTimeout(resolve, 0));

        const frame = JSON.parse(writes[0]);
        expect(frame.type).toEqual('error');
        expect(frame.error).toEqual('session queue limit reached');
    }

    @Test('routes json-rpc websocket messages through shared app rpc server')
    async routesJsonRpcMessagesThroughSharedAppRpcServer() {
        const writes: string[] = [];
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const ws = new ChatWebSocket({} as any, owners, {
            enqueue: async (_sessionId: string, task: () => Promise<void>) => task(),
            remove: () => undefined
        } as any, {
            async *streamPayload(payload: any) {
                yield {
                    jsonrpc: '2.0',
                    method: 'run.turn_stream.chunk',
                    params: {
                        requestId: payload.id,
                        sessionId: payload.params.sessionId,
                        chunkType: 'text',
                        content: 'hel'
                    }
                };
                yield {
                    jsonrpc: '2.0',
                    id: payload.id,
                    result: {
                        sessionId: payload.params.sessionId,
                        message: { content: 'hello' }
                    }
                };
            }
        } as any);
        const socket = {
            write: (buffer: Buffer) => {
                const payloadLength = buffer[1] & 0x7f;
                const offset = payloadLength < 126 ? 2 : 4;
                writes.push(buffer.subarray(offset).toString('utf8'));
                return true;
            }
        } as any;

        await (ws as any).handleMessage(socket, JSON.stringify({
            jsonrpc: '2.0',
            id: 7,
            method: 'run.turn_stream',
            params: { input: 'hello' }
        }), 's1', 'user-1');
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(JSON.parse(writes[0])).toEqual({
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: 7,
                sessionId: 's1',
                chunkType: 'text',
                content: 'hel'
            }
        });
        expect(JSON.parse(writes[1])).toEqual({
            jsonrpc: '2.0',
            id: 7,
            result: {
                sessionId: 's1',
                message: { content: 'hello' }
            }
        });
    }
}

@Suite('AuditHandler')
export class AuditHandlerTest {
    @Test('lists audit records for owned session and supports filtering')
    async listsAuditRecordsForOwnedSession() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        const audit = {
            async list(sessionId?: string) {
                const records = [{
                    id: 'a1',
                    sessionId: 's1',
                    toolName: 'echo',
                    toolCallId: 'tool-1',
                    status: 'success',
                    createdAt: 1,
                    inputSummary: 'hi',
                    outputSummary: 'ok'
                }, {
                    id: 'a2',
                    sessionId: 's1',
                    toolName: 'write_file',
                    toolCallId: 'tool-2',
                    status: 'error',
                    createdAt: 2,
                    error: 'boom'
                }, {
                    id: 'a3',
                    sessionId: 's2',
                    toolName: 'echo',
                    toolCallId: 'tool-3',
                    status: 'success',
                    createdAt: 3
                }];
                return records.filter(record => !sessionId || record.sessionId === sessionId);
            }
        } as any;
        const handler = new AuditHandler(audit, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/audit' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/audit?sessionId=s1&toolName=write_file&status=error' } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.records.length).toEqual(1);
        expect(data.records[0].id).toEqual('a2');
        expect(data.records[0].error).toEqual('boom');
    }

    @Test('rejects audit access for another principal')
    async rejectsForeignAuditAccess() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new AuditHandler({ list: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/audit' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/audit?sessionId=s1' } as any;
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any);
        expect(status).toEqual(403);
    }
}

@Suite('MemoryHandler')
export class MemoryHandlerTest {
    @Test('lists only memory for owned sessions')
    async listsOwnedSessionMemory() {
        const runtime = { putMemory: async () => null } as any;
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        await memory.put({ id: '1', sessionId: 's1', key: 'a', value: 'one', scope: 'session', createdAt: 1 });
        await memory.put({ id: '2', sessionId: 's2', key: 'b', value: 'two', scope: 'session', createdAt: 2 });
        const handler = new MemoryHandler(runtime, memory, store, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/memory' && route.method === 'GET')!;
        let body = '';
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.length).toEqual(1);
        expect(data[0].sessionId).toEqual('s1');
    }

    @Test('rejects writing memory to foreign session')
    async rejectsForeignSessionMemoryWrite() {
        let called = false;
        const store = new InMemorySessionStore();
        const runtime = {
            putMemory: async () => {
                called = true;
                return null;
            }
        } as any;
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        const securedHandler = new MemoryHandler(runtime, new InMemoryMemoryStore(), store, owners);
        const route = securedHandler.getRoutes().find(route => route.path === '/api/memory' && route.method === 'POST')!;
        let status = 0;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any, { sessionId: 's2', key: 'x', value: 'y', scope: 'session' });
        expect(status).toEqual(403);
        expect(called).toEqual(false);
    }

    @Test('persists owner across store instances')
    async persistsOwnerAcrossStoreInstances() {
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const reloadedOwners = new SessionOwnerStore(store);

        expect(await reloadedOwners.getOwner('s1')).toEqual('user-1');
        expect(await reloadedOwners.canResume('s1', 'user-1')).toEqual(true);
        expect(await reloadedOwners.canResume('s1', 'user-2')).toEqual(false);
    }

    @Test('rejects global memory writes')
    async rejectsGlobalMemoryWrite() {
        let called = false;
        const store = new InMemorySessionStore();
        const runtime = {
            putMemory: async () => {
                called = true;
                return null;
            }
        } as any;
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new MemoryHandler(runtime, new InMemoryMemoryStore(), store, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/memory' && route.method === 'POST')!;
        let status = 0;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any, { sessionId: 's1', key: 'x', value: 'y', scope: 'global' });
        expect(status).toEqual(400);
        expect(called).toEqual(false);
    }
}

@Suite('PairingStore')
export class PairingStoreTest {
    @Test('generates and validates pairing codes')
    pairAndValidate() {
        const store = new PairingStore();
        const code = store.generate();

        expect(code.code).toBeTruthy();
        expect(code.used).toBe(false);

        expect(store.validate(code.code)).toBe(true);
        expect(store.validate(code.code)).toBe(false);
    }
}

@Suite('AppRpcServer')
export class AppRpcServerTest {
    @Test('runs turns through shared json-rpc session flow')
    async runsTurnsThroughJsonRpc() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async runTurn(sessionId: string, input: string) {
                await store.append(sessionId, { id: 'u1', role: 'user', content: input, createdAt: 1 } as any);
                await store.append(sessionId, { id: 'a1', role: 'assistant', content: `done:${input}`, createdAt: 2 } as any);
                return { output: `done:${input}` };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory(sessionId: string, key: string, value: string) {
                const record = { id: `${sessionId}:${key}`, sessionId, key, value, scope: 'session', createdAt: Date.now() } as any;
                await memory.put(record);
                return record;
            },
            async searchMemory(sessionId: string, query: string) {
                return memory.search(query, sessionId);
            }
        } as any;
        const tools = {
            getToolDefinitions() {
                return [{ name: 'echo', description: 'Echo tool' }];
            },
            async activateTool() {
                return true;
            },
            async invoke(name: string, input: any, sessionId: string) {
                return { name, input, sessionId };
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, tools, owners, sessions, events);

        const runResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'run.turn',
            params: { sessionId: 'rpc-s1', input: 'hello' }
        }, { principalId: 'user-1' });
        expect((runResponse as any).result.sessionId).toEqual('rpc-s1');
        expect((runResponse as any).result.message.content).toEqual('done:hello');

        const memoryResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'memory.put',
            params: { sessionId: 'rpc-s1', key: 'city', value: 'chengdu' }
        }, { principalId: 'user-1' });
        expect((memoryResponse as any).result.key).toEqual('city');

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'session.list',
            params: {}
        }, { principalId: 'user-1' });
        expect((listResponse as any).result.length).toEqual(1);
        expect((listResponse as any).result[0].id).toEqual('rpc-s1');

        await store.setWorkspace('rpc-s1', '/tmp/project-rpc');
        const projectResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 5,
            method: 'session.list_projects',
            params: {}
        }, { principalId: 'user-1' });
        expect((projectResponse as any).result[0].workspace).toEqual('/tmp/project-rpc');
        expect((projectResponse as any).result[0].sessions[0].id).toEqual('rpc-s1');

        const toolResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools.invoke',
            params: { sessionId: 'rpc-s1', name: 'echo', input: { value: 'x' } }
        }, { principalId: 'user-1' });
        expect((toolResponse as any).result.output).toEqual({ name: 'echo', input: { value: 'x' }, sessionId: 'rpc-s1' });
    }

    @Test('rejects foreign session access through json-rpc')
    async rejectsForeignSessionAccess() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages() {
                return [];
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.messages',
            params: { sessionId: 'rpc-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
        expect((response as any).error.message).toEqual('Forbidden');
    }

    @Test('supports json-rpc batch requests and notifications')
    async supportsBatchRequestsAndNotifications() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async runTurn(sessionId: string, input: string) {
                await store.append(sessionId, { id: `${sessionId}-u`, role: 'user', content: input, createdAt: 1 } as any);
                await store.append(sessionId, { id: `${sessionId}-a`, role: 'assistant', content: `ok:${input}`, createdAt: 2 } as any);
                return { output: `ok:${input}` };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);

        const response = await rpc.handlePayload([{
            jsonrpc: '2.0',
            id: 1,
            method: 'app.ping'
        }, {
            jsonrpc: '2.0',
            method: 'session.create',
            params: { sessionId: 'notify-only' }
        }, {
            jsonrpc: '2.0',
            id: 2,
            method: 'run.turn',
            params: { sessionId: 'rpc-batch', input: 'hello' }
        }], { principalId: 'user-1' });

        expect(response).toBeTruthy();
        expect(Array.isArray(response)).toEqual(true);
        expect((response as any[]).length).toEqual(2);
        expect((response as any[])[0].id).toEqual(1);
        expect((response as any[])[1].id).toEqual(2);
        expect(await owners.getOwner('notify-only')).toEqual('user-1');
    }

    @Test('returns shared app state through json-rpc')
    async returnsSharedAppState() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(
            runtime,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {
                ui: {
                    title: 'Console',
                    console: {
                        workspace: '/tmp/workspace'
                    }
                },
                model: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    defaultProfile: 'flash'
                },
                bootstrapTurn: {
                    sessionId: 'rpc-init'
                }
            } as any
        );

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 7,
            method: 'app.state'
        }, { principalId: 'user-1' });

        expect((response as any).result).toEqual({
            sessionId: 'rpc-init',
            workspace: '/tmp/workspace',
            title: 'Console',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number)
        });
        expect(await owners.getOwner('rpc-init')).toEqual('user-1');
    }

    @Test('returns most recent workspace session through shared app state')
    async returnsMostRecentWorkspaceSessionThroughSharedAppState() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(
            runtime,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {
                ui: {
                    title: 'Console',
                    console: {
                        workspace: '/tmp/workspace'
                    }
                },
                model: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    defaultProfile: 'flash'
                }
            } as any
        );

        await owners.create('workspace-old', 'user-1');
        await store.setWorkspace('workspace-old', '/tmp/workspace');
        await store.append('workspace-old', { id: 'm1', role: 'user', content: 'old', createdAt: 1 } as any);

        await new Promise(resolve => setTimeout(resolve, 5));

        await owners.create('other-workspace-newer', 'user-1');
        await store.setWorkspace('other-workspace-newer', '/tmp/other');
        await store.append('other-workspace-newer', { id: 'm2', role: 'user', content: 'other', createdAt: 2 } as any);

        await new Promise(resolve => setTimeout(resolve, 5));

        await owners.create('workspace-latest', 'user-1');
        await store.setWorkspace('workspace-latest', '/tmp/workspace');
        await store.append('workspace-latest', { id: 'm3', role: 'user', content: 'latest', createdAt: 3 } as any);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 8,
            method: 'app.state'
        }, { principalId: 'user-1' });

        expect((response as any).result.sessionId).toEqual('workspace-latest');
        expect((response as any).result.workspace).toEqual('/tmp/workspace');
    }

    @Test('creates fresh chat session id when workspace has no prior session')
    async createsFreshChatSessionIdWhenWorkspaceHasNoPriorSession() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(
            runtime,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {
                ui: {
                    title: 'Console',
                    console: {
                        workspace: '/tmp/workspace'
                    }
                },
                model: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash'
                }
            } as any
        );

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 9,
            method: 'app.state'
        }, { principalId: 'user-1' });

        const sessionId = String((response as any).result.sessionId || '');
        expect(sessionId.startsWith('chat-')).toEqual(true);
        expect(sessionId).not.toEqual('default');
        expect(await owners.getOwner(sessionId)).toEqual('user-1');
    }

    @Test('lists and activates model profiles through json-rpc')
    async listsAndActivatesModelProfiles() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(
            runtime,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {
                model: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    defaultProfile: 'flash',
                    profiles: {
                        flash: { provider: 'deepseek', model: 'deepseek-v4-flash' },
                        strong: { provider: 'deepseek', model: 'deepseek-v4-pro', reasoning: true }
                    }
                },
                bootstrapTurn: {
                    sessionId: 'rpc-model'
                }
            } as any
        );

        const listed = await rpc.handle({
            jsonrpc: '2.0',
            id: 8,
            method: 'model.list'
        }, { principalId: 'user-1' });

        expect((listed as any).result).toEqual([
            {
                name: 'flash',
                selected: true,
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                baseUrl: '',
                reasoning: undefined,
                thinkingBudget: undefined
            },
            {
                name: 'strong',
                selected: false,
                provider: 'deepseek',
                model: 'deepseek-v4-pro',
                baseUrl: '',
                reasoning: true,
                thinkingBudget: undefined
            }
        ]);

        const activated = await rpc.handle({
            jsonrpc: '2.0',
            id: 9,
            method: 'model.activate',
            params: {
                sessionId: 'rpc-model',
                name: 'strong'
            }
        }, { principalId: 'user-1' });

        expect((activated as any).result).toEqual({
            sessionId: 'rpc-model',
            modelProfile: 'strong',
            provider: 'deepseek',
            model: 'deepseek-v4-pro'
        });
    }

    @Test('stores console input history per workspace through json-rpc')
    async storesConsoleInputHistoryPerWorkspace() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(
            runtime,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {
                bootstrapTurn: {
                    sessionId: 'rpc-history'
                }
            } as any
        );

        await rpc.handle({
            jsonrpc: '2.0',
            id: 10,
            method: 'app.inputHistory.put',
            params: {
                sessionId: 'rpc-history',
                workspace: '/tmp/workspace-a',
                entries: ['first', '/help', 'second']
            }
        }, { principalId: 'user-1' });

        await rpc.handle({
            jsonrpc: '2.0',
            id: 11,
            method: 'app.inputHistory.put',
            params: {
                sessionId: 'rpc-history',
                workspace: '/tmp/workspace-b',
                entries: ['other']
            }
        }, { principalId: 'user-1' });

        const workspaceA = await rpc.handle({
            jsonrpc: '2.0',
            id: 12,
            method: 'app.inputHistory.get',
            params: {
                sessionId: 'rpc-history',
                workspace: '/tmp/workspace-a'
            }
        }, { principalId: 'user-1' });

        const workspaceB = await rpc.handle({
            jsonrpc: '2.0',
            id: 13,
            method: 'app.inputHistory.get',
            params: {
                sessionId: 'rpc-history',
                workspace: '/tmp/workspace-b'
            }
        }, { principalId: 'user-1' });

        expect((workspaceA as any).result).toEqual(['first', '/help', 'second']);
        expect((workspaceB as any).result).toEqual(['other']);
    }

    @Test('stores console input history per session within the same workspace through json-rpc')
    async storesConsoleInputHistoryPerSessionWithinSharedWorkspace() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(
            runtime,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {
                bootstrapTurn: {
                    sessionId: 'rpc-history-a'
                }
            } as any
        );

        await rpc.handle({
            jsonrpc: '2.0',
            id: 20,
            method: 'app.inputHistory.put',
            params: {
                sessionId: 'rpc-history-a',
                workspace: '/tmp/shared-workspace',
                entries: ['session a']
            }
        }, { principalId: 'user-1' });

        await rpc.handle({
            jsonrpc: '2.0',
            id: 21,
            method: 'app.inputHistory.put',
            params: {
                sessionId: 'rpc-history-b',
                workspace: '/tmp/shared-workspace',
                entries: ['session b']
            }
        }, { principalId: 'user-1' });

        const sessionA = await rpc.handle({
            jsonrpc: '2.0',
            id: 22,
            method: 'app.inputHistory.get',
            params: {
                sessionId: 'rpc-history-a',
                workspace: '/tmp/shared-workspace'
            }
        }, { principalId: 'user-1' });

        const sessionB = await rpc.handle({
            jsonrpc: '2.0',
            id: 23,
            method: 'app.inputHistory.get',
            params: {
                sessionId: 'rpc-history-b',
                workspace: '/tmp/shared-workspace'
            }
        }, { principalId: 'user-1' });

        expect((sessionA as any).result).toEqual(['session a']);
        expect((sessionB as any).result).toEqual(['session b']);
    }

    @Test('lists audit records through json-rpc and applies filters')
    async listsAuditRecordsThroughJsonRpc() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await store.get('rpc-audit');
        await owners.create('rpc-audit', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const audit = {
            async list(sessionId?: string) {
                expect(sessionId).toEqual('rpc-audit');
                return [
                    { id: 'a1', sessionId: 'rpc-audit', toolName: 'coding_task', toolCallId: 'tc-1', status: 'success', createdAt: 1, metadata: { workerId: 'worker-1' } },
                    { id: 'a2', sessionId: 'rpc-audit', toolName: 'git_operations', toolCallId: 'tc-2', status: 'error', error: 'merge failed', createdAt: 2 }
                ];
            }
        } as any;
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {} as any, audit);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 14,
            method: 'audit.list',
            params: {
                sessionId: 'rpc-audit',
                toolName: 'coding_task'
            }
        }, { principalId: 'user-1' });

        expect((response as any).result).toEqual({
            sessionId: 'rpc-audit',
            records: [{
                id: 'a1',
                sessionId: 'rpc-audit',
                toolName: 'coding_task',
                toolCallId: 'tc-1',
                status: 'success',
                inputSummary: null,
                outputSummary: null,
                error: null,
                durationMs: null,
                attemptCount: null,
                principalId: null,
                createdAt: 1,
                metadata: { workerId: 'worker-1' }
            }]
        });
    }

    @Test('reads coding task review data through json-rpc')
    async readsCodingTaskReviewDataThroughJsonRpc() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await store.get('rpc-review');
        await owners.create('rpc-review', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const reviewTask = {
            id: 'task-1',
            title: 'Patch handlers',
            status: 'completed',
            actions: [{ id: 'edit-1', title: 'Edit', tool: 'edit_file', input: {}, status: 'completed', workerId: 'worker-1' }],
            result: {
                executionMode: 'parallel',
                completedActions: 1,
                diff: { summary: '1 worker diff(s) captured', output: { workers: [] } },
                workers: [{
                    workerId: 'worker-1',
                    actionIds: ['edit-1'],
                    status: 'completed',
                    branch: 'coding-task/task1worker1',
                    worktreePath: '.worktrees/task1worker1'
                }]
            },
            metadata: { executionMode: 'parallel', useWorktree: true }
        };
        const tools = {
            getToolDefinitions() {
                return [{ name: 'coding_task', description: 'Coding task', activation: { kind: 'always', scope: 'session', activated: true } }];
            },
            getToolDefinition(name: string) {
                return name === 'coding_task'
                    ? { name: 'coding_task', description: 'Coding task', activation: { kind: 'always', scope: 'session', activated: true } }
                    : undefined;
            },
            async activateTool() {
                return true;
            },
            async invoke(name: string, input: any, sessionId: string) {
                expect(name).toEqual('coding_task');
                expect(sessionId).toEqual('rpc-review');
                if (input.action === 'list') {
                    return { tasks: [reviewTask], total: 1 };
                }
                if (input.action === 'get') {
                    expect(input.task_id).toEqual('task-1');
                    return { task: reviewTask };
                }
                if (input.action === 'rollback') {
                    expect(input.task_id).toEqual('task-1');
                    return {
                        rolledBack: true,
                        task: {
                            ...reviewTask,
                            status: 'rolled_back',
                            result: {
                                ...reviewTask.result,
                                rollback: {
                                    available: false,
                                    checkpointId: 'checkpoint-task-1',
                                    mode: 'parallel_worktree',
                                    rolledBackAt: 3
                                }
                            }
                        }
                    };
                }
                if (input.action === 'cancel') {
                    expect(input.task_id).toEqual('task-1');
                    return {
                        cancelled: true,
                        task: {
                            ...reviewTask,
                            status: 'cancelled'
                        }
                    };
                }
                if (input.action === 'retry_failed') {
                    expect(input.task_id).toEqual('task-1');
                    return {
                        ran: true,
                        task: {
                            ...reviewTask,
                            id: 'task-1-retry',
                            title: 'Retry failed workers: Patch handlers'
                        }
                    };
                }
                throw new Error('unexpected action');
            }
        } as any;
        const rpc = new AppRpcServer(runtime, store, memory, tools, owners, new SessionHandler(runtime, store, owners), events);

        const listed = await rpc.handle({
            jsonrpc: '2.0',
            id: 15,
            method: 'coding_task.list',
            params: { sessionId: 'rpc-review' }
        }, { principalId: 'user-1' });
        expect((listed as any).result.total).toEqual(1);
        expect((listed as any).result.tasks[0].id).toEqual('task-1');

        const fetched = await rpc.handle({
            jsonrpc: '2.0',
            id: 16,
            method: 'coding_task.get',
            params: { sessionId: 'rpc-review', taskId: 'task-1' }
        }, { principalId: 'user-1' });
        expect((fetched as any).result.task.id).toEqual('task-1');

        const diff = await rpc.handle({
            jsonrpc: '2.0',
            id: 17,
            method: 'coding_task.diff',
            params: { sessionId: 'rpc-review', taskId: 'task-1' }
        }, { principalId: 'user-1' });
        expect((diff as any).result).toEqual({
            sessionId: 'rpc-review',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: { summary: '1 worker diff(s) captured', output: { workers: [] } },
            workers: [{
                workerId: 'worker-1',
                actionIds: ['edit-1'],
                status: 'completed',
                branch: 'coding-task/task1worker1',
                worktreePath: '.worktrees/task1worker1'
            }]
        });

        const rolledBack = await rpc.handle({
            jsonrpc: '2.0',
            id: 18,
            method: 'coding_task.rollback',
            params: { sessionId: 'rpc-review', taskId: 'task-1' }
        }, { principalId: 'user-1' });
        expect((rolledBack as any).result).toEqual({
            sessionId: 'rpc-review',
            taskId: 'task-1',
            rolledBack: true,
            task: {
                ...reviewTask,
                status: 'rolled_back',
                result: {
                    ...reviewTask.result,
                    rollback: {
                        available: false,
                        checkpointId: 'checkpoint-task-1',
                        mode: 'parallel_worktree',
                        rolledBackAt: 3
                    }
                }
            }
        });

        const cancelled = await rpc.handle({
            jsonrpc: '2.0',
            id: 19,
            method: 'coding_task.cancel',
            params: { sessionId: 'rpc-review', taskId: 'task-1' }
        }, { principalId: 'user-1' });
        expect((cancelled as any).result).toEqual({
            sessionId: 'rpc-review',
            taskId: 'task-1',
            cancelled: true,
            task: {
                ...reviewTask,
                status: 'cancelled'
            }
        });

        const retried = await rpc.handle({
            jsonrpc: '2.0',
            id: 20,
            method: 'coding_task.retry_failed',
            params: { sessionId: 'rpc-review', taskId: 'task-1' }
        }, { principalId: 'user-1' });
        expect((retried as any).result).toEqual({
            sessionId: 'rpc-review',
            taskId: 'task-1',
            retried: true,
            task: {
                ...reviewTask,
                id: 'task-1-retry',
                title: 'Retry failed workers: Patch handlers'
            }
        });
    }

    @Test('streams shared turn chunks and final response')
    async streamsSharedTurnChunksAndFinalResponse() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const streamedPrincipals: string[] = [];
        const runtime = {
            async *runStreamingTurn(sessionId: string, input: string, principalId?: string) {
                streamedPrincipals.push(principalId || '');
                await store.append(sessionId, { id: 'u1', role: 'user', content: input, createdAt: 1 } as any);
                yield { type: 'text', content: 'hel' };
                yield { type: 'text', content: 'lo' };
                await store.append(sessionId, { id: 'a1', role: 'assistant', content: 'hello', createdAt: 2 } as any);
                yield { type: 'done' };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);

        const frames: any[] = [];
        for await (const frame of rpc.streamPayload({
            jsonrpc: '2.0',
            id: 11,
            method: 'run.turn_stream',
            params: { sessionId: 'rpc-stream', input: 'hello' }
        }, { principalId: 'user-1' })) {
            frames.push(frame);
        }

        expect(frames).toEqual([{
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: 11,
                sessionId: 'rpc-stream',
                chunkType: 'event',
                eventType: 'turn_started',
                label: 'state',
                status: 'running',
                content: 'Analyzing request'
            }
        }, {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: 11,
                sessionId: 'rpc-stream',
                chunkType: 'text',
                content: 'hel',
                usage: undefined
            }
        }, {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: 11,
                sessionId: 'rpc-stream',
                chunkType: 'text',
                content: 'lo',
                usage: undefined
            }
        }, {
            jsonrpc: '2.0',
            id: 11,
            result: {
                sessionId: 'rpc-stream',
                message: { id: 'a1', role: 'assistant', content: 'hello', createdAt: 2 }
            }
        }]);
        expect(streamedPrincipals).toEqual(['user-1']);
    }
}

@Suite('AppRpcHandler')
export class AppRpcHandlerTest {
    @Test('formats invalid rpc requests as json-rpc errors')
    async formatsInvalidRpcRequests() {
        const handler = new AppRpcHandler({
            async handlePayload() {
                throw new Error('boom');
            }
        } as any);
        const route = handler.getRoutes()[0];
        let body = '';
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler({} as any, res, {}, { id: 7 }, { principalId: 'user-1' });
        expect(status).toEqual(200);
        expect(JSON.parse(body)).toEqual({
            jsonrpc: '2.0',
            id: 7,
            error: {
                code: -32603,
                message: 'boom'
            }
        });
    }
}

@Suite('StdioAppRpcServer')
export class StdioAppRpcServerTest {
    @Test('streams json-rpc responses over jsonl stdio transport')
    async streamsJsonRpcResponsesOverJsonlTransport() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async runTurn(sessionId: string, input: string) {
                await store.append(sessionId, { id: 'u1', role: 'user', content: input, createdAt: 1 } as any);
                await store.append(sessionId, { id: 'a1', role: 'assistant', content: `stdio:${input}`, createdAt: 2 } as any);
                return { output: `stdio:${input}` };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        const stdio = new StdioAppRpcServer(rpc);
        const input = new PassThrough();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });

        stdio.start({ input, output, context: { principalId: 'user-1' } });
        input.write('{"jsonrpc":"2.0","id":1,"method":"app.ping"}\n');
        input.write('[{"jsonrpc":"2.0","method":"session.create","params":{"sessionId":"rpc-stdio"}},{"jsonrpc":"2.0","id":2,"method":"session.list","params":{}}]\n');
        const waitForLines = async (expected: number) => {
            const started = Date.now();
            while (Date.now() - started < 250) {
                if (buffer.trim().split('\n').filter(Boolean).length >= expected) {
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 5));
            }
        };
        await waitForLines(2);
        stdio.stop({ input });

        const responses = buffer.trim().split('\n').map(line => JSON.parse(line));
        expect(responses.length).toEqual(2);
        expect(responses[0].id).toEqual(1);
        expect(responses[0].result.ok).toEqual(true);
        expect(Array.isArray(responses[1])).toEqual(true);
        expect(responses[1][0].id).toEqual(2);
        expect(responses[1][0].result[0].id).toEqual('rpc-stdio');
    }

    @Test('streams run turn chunks over stdio jsonl transport')
    async streamsRunTurnChunksOverStdioJsonlTransport() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            async *runStreamingTurn(sessionId: string, input: string) {
                await store.append(sessionId, { id: 'u1', role: 'user', content: input, createdAt: 1 } as any);
                yield { type: 'text', content: 'hel' };
                await store.append(sessionId, { id: 'a1', role: 'assistant', content: 'hello', createdAt: 2 } as any);
                yield { type: 'done' };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async putMemory() {
                return null;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        const stdio = new StdioAppRpcServer(rpc);
        const input = new PassThrough();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });

        stdio.start({ input, output, context: { principalId: 'user-1' } });
        input.write('{"jsonrpc":"2.0","id":9,"method":"run.turn_stream","params":{"sessionId":"rpc-stdio-stream","input":"hello"}}\n');
        const waitForLines = async (expected: number) => {
            const started = Date.now();
            while (Date.now() - started < 250) {
                if (buffer.trim().split('\n').filter(Boolean).length >= expected) {
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 5));
            }
        };
        await waitForLines(2);
        stdio.stop({ input });

        const responses = buffer.trim().split('\n').map(line => JSON.parse(line));
        expect(responses).toEqual([{
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: 9,
                sessionId: 'rpc-stdio-stream',
                chunkType: 'event',
                eventType: 'turn_started',
                label: 'state',
                status: 'running',
                content: 'Analyzing request'
            }
        }, {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: 9,
                sessionId: 'rpc-stdio-stream',
                chunkType: 'text',
                content: 'hel'
            }
        }, {
            jsonrpc: '2.0',
            id: 9,
            result: {
                sessionId: 'rpc-stdio-stream',
                message: { id: 'a1', role: 'assistant', content: 'hello', createdAt: 2 }
            }
        }]);
    }

    @Test('returns parse errors for invalid stdio jsonl frames')
    async returnsParseErrorsForInvalidFrames() {
        const stdio = new StdioAppRpcServer({
            async handlePayload() {
                return null;
            }
        } as any);
        const input = new PassThrough();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });

        stdio.start({ input, output });
        input.write('{bad json}\n');
        await new Promise(resolve => setTimeout(resolve, 10));
        stdio.stop({ input });

        const response = JSON.parse(buffer.trim());
        expect(response.error.code).toEqual(-32700);
    }
}

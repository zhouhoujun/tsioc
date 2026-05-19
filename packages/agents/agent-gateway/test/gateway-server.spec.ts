import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { HttpAuthService, JWTService } from '@tsdi/security';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { RouteMatcher } from '../src/gateway/RouteMatcher';
import { ChatWebSocket } from '../src/ws/ChatWebSocket';
import { RateLimiter } from '../src/auth/RateLimiter';
import { AuthMiddleware, getRequestPrincipalId, setRequestAuth } from '../src/auth/AuthMiddleware';
import { PairingStore } from '../src/auth/PairingStore';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { SessionHandler } from '../src/api/SessionHandler';
import { EventHandler } from '../src/api/EventHandler';
import { InMemorySessionStore, InMemoryMemoryStore, AgentTurnStartedEvent, AgentStreamChunkEvent, AgentToolInvokedEvent, AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolSkippedEvent, AgentTurnCompletedEvent, AgentErrorEvent, LocalToolRegistry } from '@tsdi/agent';
import { MemoryHandler } from '../src/api/MemoryHandler';
import { ToolsHandler } from '../src/api/ToolsHandler';
import { ReadFileTool } from '../../agent-tools/src';

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

        const bundleRoute = handler.getRoutes().find(route => route.path === '/api/tool-bundles' && route.method === 'GET')!;
        body = '';
        await bundleRoute.handler({} as any, res, {} as any);
        const bundleData = JSON.parse(body);
        expect(bundleData).toEqual(bundles);
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
            inputSchema: null
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

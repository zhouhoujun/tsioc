import { Application, RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import { Buffer } from 'buffer';
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
import { ReviewHandler } from '../src/api/ReviewHandler';
import { CompactionHistoryHandler } from '../src/api/CompactionHistoryHandler';
import { TurnDiagnosticsHandler } from '../src/api/TurnDiagnosticsHandler';
import { SummaryQualityHandler } from '../src/api/SummaryQualityHandler';
import { UsageHandler } from '../src/api/UsageHandler';
import { AgentModule, MemoryStore, provideAgentOrm, SessionStore, TIMELINE_HISTORY_STORE, AgentTurnStartedEvent, AgentStreamChunkEvent, AgentToolInvokedEvent, AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolSkippedEvent, AgentTurnCompletedEvent, AgentErrorEvent, AgentApprovalRequestedEvent, AgentApprovalCompletedEvent, AgentApprovalFailedEvent, AgentCompensationEvent, AgentContextPreparedEvent, AgentTurnDiagnosticsEvent, LocalToolRegistry, ToolApprovalManager, WeaknessMiner, ReviewFindingsStore } from '@tsdi/agent';
import { MemoryHandler } from '../src/api/MemoryHandler';
import { ToolsHandler } from '../src/api/ToolsHandler';
import { ApprovalHandler } from '../src/api/ApprovalHandler';
import { StatsHandler } from '../src/api/StatsHandler';
import { AuditSink } from '../../agent/src/harness/AuditSink';
import { ReadFileTool } from '../../agent-tools/src';
import { AgentGatewayModule, provideAgentGateway } from '../src';
import {
    AudioSessionHandler,
    StreamingTranscriptionAdapter,
    StreamingTranscriptionResult,
    StreamingTtsAdapter,
    StreamingTtsOptions
} from '../src/audio';

async function createOrmSessionStore() {
    const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
    return { context, store: context.get(SessionStore), memory: context.get(MemoryStore), timeline: context.get(TIMELINE_HISTORY_STORE), audit: context.get(AuditSink) };
}

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
    private async ormStore() {
        const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        return { context, store: context.get(SessionStore) };
    }
    @Test('hides automation sessions unless explicitly requested')
    async hidesAutomationSessions() {
        const { store } = await this.ormStore();
        const owners = new SessionOwnerStore(store);
        await store.append('interactive', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await store.append('automation', { id: '2', role: 'user', content: 'job', createdAt: 2 });
        await store.setProjectMetadata('automation', { sessionRole: 'automation' });
        await owners.create('interactive', 'user-1');
        await owners.create('automation', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);

        expect((await handler.listSessionInfos('user-1')).map(info => info.id)).toEqual(['interactive']);
        expect((await handler.listSessionInfos('user-1', false, true)).map(info => info.id).sort()).toEqual(['automation', 'interactive']);
    }

    @Test('lists tracked sessions with timestamps')
    async listsTrackedSessions() {
        const { store } = await this.ormStore();
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

    @Test('lists sessions with title and pinned flags')
    async listsSessionsWithTitleAndPinned() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await store.setTitle('s1', 'My session');
        await store.setPinned('s1', true);
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
        expect(data[0].title).toEqual('My session');
        expect(data[0].pinned).toEqual(true);
    }

    @Test('sorts pinned sessions before unpinned sessions')
    async sortsPinnedSessionsFirst() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const originalNow = Date.now;
        let now = 100;
        Date.now = () => ++now;
        try {
            await store.append('unpinned', { id: '1', role: 'user', content: 'newer', createdAt: 3 });
            await store.append('pinned', { id: '2', role: 'user', content: 'older', createdAt: 1 });
            await store.setPinned('pinned', true);
            await owners.create('unpinned', 'user-1');
            await owners.create('pinned', 'user-1');
        } finally {
            Date.now = originalNow;
        }
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('unpinned');
        handler.track('pinned');

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
        expect(data.map((session: any) => session.id)).toEqual(['pinned', 'unpinned']);
        expect(data[0].pinned).toEqual(true);
        expect(data[1].pinned).toEqual(false);
    }

    @Test('sets and clears a session title through the api route')
    async setsAndClearsSessionTitleThroughApi() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const setTitleRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/title' && route.method === 'PUT')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        let status = 0;
        let body = '';
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

        await setTitleRoute.handler(req, res, { id: 's1' }, { title: 'My session' });
        expect(status).toEqual(200);
        expect(JSON.parse(body)).toEqual({ status: 'updated', title: 'My session' });
        expect((await store.get('s1')).title).toEqual('My session');

        await setTitleRoute.handler(req, res, { id: 's1' }, { title: '' });
        expect((await store.get('s1')).title).toBeUndefined();
    }

    @Test('pins and unpins a session through the api route')
    async pinsAndUnpinsSessionThroughApi() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const setPinnedRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/pinned' && route.method === 'PUT')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: () => res
        } as any;

        await setPinnedRoute.handler(req, res, { id: 's1' }, { pinned: true });
        expect((await store.get('s1')).pinned).toEqual(true);

        await setPinnedRoute.handler(req, res, { id: 's1' }, { pinned: false });
        expect((await store.get('s1')).pinned).toEqual(false);
    }

    @Test('snapshot routes create, list, restore and delete snapshots')
    async snapshotRoutesRoundTrip() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.append('s1', { id: '2', role: 'assistant', content: 'two', createdAt: 2 });
        await store.setSummary('s1', 'summary');
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: () => res
        } as any;

        const createRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/snapshots' && route.method === 'POST')!;
        let body = '';
        const createRes = {
            writeHead: () => createRes,
            end: (value?: string) => {
                body = value ?? '';
                return createRes;
            }
        } as any;
        await createRoute.handler(req, createRes, { id: 's1' }, { label: 'checkpoint' });
        const { snapshotId } = JSON.parse(body);
        expect(snapshotId).toMatch(/^snap_/);

        const listRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/snapshots' && route.method === 'GET')!;
        let listBody = '';
        const listRes = {
            writeHead: () => listRes,
            end: (value?: string) => {
                listBody = value ?? '';
                return listRes;
            }
        } as any;
        await listRoute.handler(req, listRes, { id: 's1' });
        const snapshots = JSON.parse(listBody);
        expect(snapshots.length).toEqual(1);
        expect(snapshots[0].snapshotId).toEqual(snapshotId);
        expect(snapshots[0].label).toEqual('checkpoint');
        expect(snapshots[0].messageCount).toEqual(2);

        await store.append('s1', { id: '3', role: 'user', content: 'three', createdAt: 3 });
        const restoreRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/snapshots/:snapshotId/restore' && route.method === 'POST')!;
        await restoreRoute.handler(req, res, { id: 's1', snapshotId });
        const state = await store.get('s1');
        expect(state.messages.length).toEqual(2);
        expect(state.messages.map((message: any) => message.content)).toEqual(['one', 'two']);

        const deleteRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/snapshots/:snapshotId' && route.method === 'DELETE')!;
        await deleteRoute.handler(req, res, { id: 's1', snapshotId });
        expect(await store.listSnapshots('s1')).toEqual([]);
    }

    @Test('snapshot restore returns 404 for unknown snapshot')
    async snapshotRestoreReturns404ForUnknownSnapshot() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const restoreRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/snapshots/:snapshotId/restore' && route.method === 'POST')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await restoreRoute.handler(req, res, { id: 's1', snapshotId: 'missing' });
        expect(status).toEqual(404);
    }

    @Test('title and pinned mutation routes forbid foreign principals')
    async mutationRoutesForbidForeignPrincipals() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');

        const titleRoute = handler.getRoutes().find(route => route.path === '/api/sessions/:id/title' && route.method === 'PUT')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await titleRoute.handler(req, res, { id: 's1' }, { title: 'hijack' });
        expect(status).toEqual(403);
        expect((await store.get('s1')).title).toBeUndefined();
    }

    @Test('keeps pinned sessions first inside project groups')
    async keepsPinnedSessionsFirstInsideProjectGroups() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const originalNow = Date.now;
        let now = 100;
        Date.now = () => ++now;
        try {
            await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setWorkspace('s1', '/tmp/project-a');
            await store.append('s2', { id: '2', role: 'user', content: 'two', createdAt: 2 });
            await store.setWorkspace('s2', '/tmp/project-a');
            await store.setPinned('s2', true);
            await owners.create('s1', 'user-1');
            await owners.create('s2', 'user-1');
        } finally {
            Date.now = originalNow;
        }
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');
        handler.track('s2');

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
        expect(data[0].sessions.map((session: any) => session.id)).toEqual(['s2', 's1']);
        expect(data[0].sessions[0].pinned).toEqual(true);
    }

    @Test('lists owned sessions grouped by workspace')
    async listsOwnedSessionsGroupedByWorkspace() {
        const { store } = await createOrmSessionStore();
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

    @Test('lists owned sessions grouped by thread')
    async listsOwnedSessionsGroupedByThread() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const originalNow = Date.now;
        let now = 100;
        Date.now = () => ++now;
        try {
            await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setWorkspace('s1', '/tmp/project-a');
            await store.setProjectMetadata('s1', {
                projectId: 'exam-system',
                primaryThreadId: 'thread-1',
                originThreadId: 'root-0',
                sessionRole: 'branch',
                rootRequest: 'Build an exam system',
                focusSummary: 'Thread work'
            });
            await store.append('s2', { id: '2', role: 'user', content: 'two', createdAt: 2 });
            await store.setWorkspace('s2', '/tmp/project-a');
            await store.setProjectMetadata('s2', {
                projectId: 'exam-system',
                primaryThreadId: 'thread-1',
                originThreadId: 'root-0',
                sessionRole: 'review',
                rootRequest: 'Build an exam system',
                focusSummary: 'Thread review'
            });
            await owners.create('s1', 'user-1');
            await owners.create('s2', 'user-1');
        } finally {
            Date.now = originalNow;
        }
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');
        handler.track('s2');

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/threads' && route.method === 'GET')!;
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
        expect(data[0].threadId).toEqual('thread-1');
        expect(data[0].projectId).toEqual('exam-system');
        expect(data[0].workspace).toEqual('/tmp/project-a');
        expect(data[0].title).toEqual('Thread review');
        expect(data[0].rootRequest).toEqual('Build an exam system');
        expect(data[0].status).toEqual('completed');
        expect(data[0].stage).toEqual('review');
        expect(data[0].originThreadId).toEqual('root-0');
        expect(data[0].currentSessionId).toEqual('s2');
        expect(data[0].sessionCount).toEqual(2);
        expect(data[0].sessions.map((session: any) => session.id).sort()).toEqual(['s1', 's2']);
    }

    @Test('lists worker threads with terminal status from session metadata')
    async listsWorkerThreadsWithTerminalStatus() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('w1', { id: '1', role: 'user', content: 'work', createdAt: 1 });
        await store.setWorkspace('w1', '/tmp/project-a');
        await store.setProjectMetadata('w1', {
            projectId: 'exam-system',
            primaryThreadId: 'thread-w',
            sessionRole: 'worker',
            threadStatus: 'blocked',
            focusSummary: 'Worker focus'
        });
        await owners.create('w1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('w1');

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/threads' && route.method === 'GET')!;
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
        expect(data[0].threadId).toEqual('thread-w');
        expect(data[0].status).toEqual('blocked');
        expect(data[0].stage).toEqual('implementation');
        expect(data[0].sessions[0].threadStatus).toEqual('blocked');
    }

    @Test('rejects deleting another principals session')
    async rejectsDeletingForeignSession() {
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
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

    @Test('session delete route removes session-scoped memory records')
    async sessionDeleteRouteRemovesSessionMemory() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await owners.create('s1', 'user-1');
        await memory.put({ id: 'todo-1', sessionId: 's1', key: 'agent.todo.plan', value: 'plan', scope: 'session', createdAt: 1 });
        await memory.put({ id: 'ann-1', sessionId: 's1', key: 'agent-ui.review.annotations-cache', value: '{}', scope: 'session', createdAt: 2 });
        await memory.put({ id: 'shared-1', key: 'team', value: 'agents', scope: 'global', createdAt: 3 });
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners, memory);

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/:id' && route.method === 'DELETE')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: () => res
        } as any;

        await route.handler(req, res, { id: 's1' });
        expect(await store.has('s1')).toEqual(false);
        const remaining = await memory.getAll('s1');
        expect(remaining.map((r: any) => r.id)).toEqual(['shared-1']);
    }

    @Test('session export route returns transcript with tool calls')
    async sessionExportRouteReturnsTranscript() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const messages = [
            { id: 'u1', role: 'user', content: 'inspect project', createdAt: 1 },
            { id: 'a1', role: 'assistant', content: 'Calling tool', createdAt: 2, metadata: { toolCalls: [{ id: 'tc-1', name: 'read_file', input: { path: 'README.md' } }] } },
            { id: 't1', role: 'tool', content: '{"ok":true}', createdAt: 3, toolCallId: 'tc-1' }
        ];
        for (const message of messages) {
            await store.append('sx-1', message as any);
        }
        await store.setWorkspace('sx-1', '/workspace/app');
        await owners.create('sx-1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => messages } as any, store, owners);

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/:id/export' && route.method === 'GET')!;
        const req = { url: '/api/sessions/sx-1/export?format=jsonl', headers: { host: 'localhost' } } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        let body = '';
        let headers: Record<string, any> = {};
        const res = {
            writeHead: (_code: number, value?: Record<string, any>) => {
                headers = value || {};
                return res;
            },
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, { id: 'sx-1' });
        expect(headers['Content-Type']).toContain('application/x-ndjson');
        expect(headers['Content-Disposition']).toContain('agent-session-sx-1-');
        expect(body).toContain('"type":"session"');
        expect(body).toContain('"type":"tool_call"');
        expect(body).toContain('"name":"read_file"');
    }

    @Test('session export route forbids other principals')
    async sessionExportRouteForbidsForeignPrincipal() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('sx-locked', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('sx-locked', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/:id/export' && route.method === 'GET')!;
        const req = { url: '/api/sessions/sx-locked/export', headers: { host: 'localhost' } } as any;
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res
        } as any;

        await route.handler(req, res, { id: 'sx-locked' });
        expect(status).toEqual(403);
    }

    @Test('lists persisted owned sessions without track call')
    async listsPersistedOwnedSessionsWithoutTrack() {
        const { store } = await createOrmSessionStore();
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

    @Test('lists owned sessions with thread project keys before workspace fallback')
    async listsOwnedSessionsPreferThreadProjectKeyOverWorkspace() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await store.setWorkspace('s1', '/tmp/project-a');
        await store.setProjectMetadata('s1', {
            primaryThreadId: 'thread-1'
        });
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
        expect(data[0].projectKey).toEqual('thread:thread-1');
        expect(data[0].workspace).toEqual('/tmp/project-a');
    }

    @Test('projects route prefers latest active session metadata for grouped labels')
    async projectsRoutePrefersLatestActiveSessionMetadataForGroupedLabels() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const originalNow = Date.now;
        let now = 100;
        Date.now = () => ++now;
        try {
            await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
            await store.append('s2', { id: '2', role: 'user', content: 'hello', createdAt: 2 });
            await store.setWorkspace('s1', '/tmp/project-a');
            await store.setWorkspace('s2', '/tmp/project-b');
            await store.setProjectMetadata('s1', {
                projectId: 'exam-system',
                focusSummary: 'Older summary',
                rootRequest: 'Older request'
            });
            await store.setProjectMetadata('s2', {
                projectId: 'exam-system',
                focusSummary: 'Latest summary',
                rootRequest: 'Latest request'
            });
            await owners.create('s1', 'user-1');
            await owners.create('s2', 'user-1');
        } finally {
            Date.now = originalNow;
        }
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        handler.track('s1');
        handler.track('s2');

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
        expect(data[0].label).toEqual('exam-system');
        expect(data[0].focusSummary).toEqual('Latest summary');
        expect(data[0].rootRequest).toEqual('Latest request');
        expect(data[0].workspace).toEqual('/tmp/project-b');
    }

    @Test('lists only actively running sessions')
    async listsOnlyActivelyRunningSessions() {
        const { store } = await createOrmSessionStore();
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

    @Test('cancelled turns are removed from the running sessions list')
    async cancelledTurnsAreRemovedFromRunningSessions() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s1', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, store, owners);

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

        handler.onTurnStarted({ sessionId: 's1' } as any);
        await route.handler(req, res, {} as any);
        expect(JSON.parse(body)).toEqual(['s1']);

        handler.onTurnCancelled({ sessionId: 's1' } as any);
        await route.handler(req, res, {} as any);
        expect(JSON.parse(body)).toEqual([]);
    }
}

@Suite('ApprovalHandler')
export class ApprovalHandlerTest {
    @Test('lists pending approvals and resolves them through api routes')
    async listsAndResolvesApprovals() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const approvalManager = new ToolApprovalManager({ publishEvent: async () => {} } as any, new RandomUuidGenerator(),{ requires: () => true, reason: () => 'approval required' } as any,{ defaultTimeoutMs: 60000 });
        const handler = new ApprovalHandler(approvalManager as any, owners);

        const pendingCheck = approvalManager.checkApproval('write_file', { path: '/tmp/x' }, 's-1');
        await new Promise<void>(resolve => setTimeout(resolve, 10));
        const requestId = approvalManager.getPending()[0].id;

        let listBody = '';
        const listRes = {
            writeHead: () => listRes,
            end: (value?: string) => {
                listBody = value ?? '';
                return listRes;
            }
        } as any;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const listRoute = handler.getRoutes().find(route => route.path === '/api/approvals' && route.method === 'GET')!;
        await listRoute.handler(req, listRes, {} as any);
        const listed = JSON.parse(listBody);
        expect(listed.requests.length).toEqual(1);
        expect(listed.requests[0].id).toEqual(requestId);

        const approveRoute = handler.getRoutes().find(route => route.path === '/api/approvals/:id/approve' && route.method === 'POST')!;
        let approveBody = '';
        const approveRes = {
            writeHead: () => approveRes,
            end: (value?: string) => {
                approveBody = value ?? '';
                return approveRes;
            }
        } as any;
        await approveRoute.handler(req, approveRes, { id: requestId });
        const approved = JSON.parse(approveBody);
        expect(approved.applied).toEqual(true);
        expect(approvalManager.getPending().length).toEqual(0);
        await pendingCheck;
    }

    @Test('approval routes return forbidden for non-owners')
    async approvalRoutesForbidNonOwners() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const approvalManager = new ToolApprovalManager({ publishEvent: async () => {} } as any, new RandomUuidGenerator(),{ requires: () => true, reason: () => 'approval required' } as any,{ defaultTimeoutMs: 60000 });
        const handler = new ApprovalHandler(approvalManager as any, owners);

        const pendingCheck = approvalManager.checkApproval('write_file', { path: '/tmp/x' }, 's-1');
        await new Promise<void>(resolve => setTimeout(resolve, 10));
        const requestId = approvalManager.getPending()[0].id;

        let status = 0;
        let body = '';
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
        const req = {} as any;
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });
        const approveRoute = handler.getRoutes().find(route => route.path === '/api/approvals/:id/approve' && route.method === 'POST')!;
        await approveRoute.handler(req, res, { id: requestId });
        expect(status).toEqual(403);
        expect(approvalManager.getPending().length).toEqual(1);
        approvalManager.cancelBySession('s-1');
        await pendingCheck;
    }

    @Test('approval list without sessionId is scoped to owned sessions and exposes expiresAt')
    async approvalListScopesByOwnership() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await store.get('s-2');
        await owners.create('s-1', 'user-1');
        await owners.create('s-2', 'user-2');
        const approvalManager = new ToolApprovalManager({ publishEvent: async () => {} } as any, new RandomUuidGenerator(),{ requires: () => true, reason: () => 'approval required' } as any,{ defaultTimeoutMs: 60000 });
        const handler = new ApprovalHandler(approvalManager as any, owners);

        const pendingCheck1 = approvalManager.checkApproval('write_file', { path: '/tmp/x' }, 's-1');
        const pendingCheck2 = approvalManager.checkApproval('write_file', { path: '/tmp/y' }, 's-2');
        await new Promise<void>(resolve => setTimeout(resolve, 10));

        const route = handler.getRoutes().find(route => route.path === '/api/approvals' && route.method === 'GET')!;
        const listFor = async (principalId: string): Promise<any[]> => {
            let body = '';
            const res = {
                writeHead: () => res,
                end: (value?: string) => {
                    body = value ?? '';
                    return res;
                }
            } as any;
            const req = {} as any;
            setRequestAuth(req, { token: 'token-x', principalId });
            await route.handler(req, res, {} as any);
            return JSON.parse(body).requests;
        };

        const ownedByUser1 = await listFor('user-1');
        expect(ownedByUser1.length).toEqual(1);
        expect(ownedByUser1[0].sessionId).toEqual('s-1');
        expect(ownedByUser1[0].expiresAt).toBeGreaterThanOrEqual(ownedByUser1[0].createdAt);
        expect(ownedByUser1[0].expiresAt).toEqual(ownedByUser1[0].createdAt + ownedByUser1[0].timeoutMs);

        const ownedByUser2 = await listFor('user-2');
        expect(ownedByUser2.length).toEqual(1);
        expect(ownedByUser2[0].sessionId).toEqual('s-2');

        approvalManager.cancelBySession('s-1');
        approvalManager.cancelBySession('s-2');
        await pendingCheck1;
        await pendingCheck2;
    }
}

@Suite('StatsHandler')
export class StatsHandlerTest {
    @Test('aggregates audit records scoped to owned sessions')
    async aggregatesAuditRecordsScopedToOwnedSessions() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await store.get('s-2');
        await owners.create('s-1', 'user-1');
        await owners.create('s-2', 'user-2');
        const sink = ((await createOrmSessionStore()).audit);
        await sink.append({ id: 'a1', sessionId: 's-1', toolName: 'read_file', toolCallId: 't1', status: 'success', durationMs: 10, createdAt: 100 });
        await sink.append({ id: 'a2', sessionId: 's-1', toolName: 'write_file', toolCallId: 't2', status: 'error', error: 'boom', durationMs: 30, createdAt: 200 });
        await sink.append({ id: 'a3', sessionId: 's-2', toolName: 'write_file', toolCallId: 't3', status: 'success', createdAt: 300 });
        await sink.append({ id: 'a4', sessionId: 's-1', toolName: 'write_file', toolCallId: 't4', status: 'skipped', createdAt: 400, metadata: { kind: 'approval', decision: 'denied' } });

        const handler = new StatsHandler(sink, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/stats' && route.method === 'GET')!;

        const fetchStats = async (principalId: string): Promise<any> => {
            let body = '';
            const res = {
                writeHead: () => res,
                end: (value?: string) => {
                    body = value ?? '';
                    return res;
                }
            } as any;
            const req = {} as any;
            setRequestAuth(req, { token: 'token-x', principalId });
            await route.handler(req, res, {} as any);
            return JSON.parse(body);
        };

        const stats = await fetchStats('user-1');
        expect(stats.runs).toEqual(3);
        expect(stats.ok).toEqual(1);
        expect(stats.fail).toEqual(1);
        expect(stats.skipped).toEqual(1);
        expect(stats.successRate).toEqual(33.3);
        expect(stats.avgDurationMs).toEqual(20);
        expect(stats.sessions).toEqual(1);
        expect(stats.timeRange.from).toEqual(100);
        expect(stats.timeRange.to).toEqual(400);
        expect(stats.byTool['read_file'].ok).toEqual(1);
        expect(stats.byTool['write_file'].fail).toEqual(1);
        expect(stats.byTool['write_file'].skipped).toEqual(1);
        expect(stats.byKind['approval'].runs).toEqual(1);
        expect(stats.byKind['approval'].skipped).toEqual(1);
        expect(stats.byKind['execution'].runs).toEqual(2);
        expect(stats.bySession['s-1'].runs).toEqual(3);
        expect(stats.bySession['s-1'].fail).toEqual(1);
        const dayKey = new Date(100).toISOString().slice(0, 10);
        expect(stats.byDay[dayKey].runs).toEqual(3);
        expect(stats.errors).toEqual([
            { toolName: 'write_file', error: 'boom', count: 1, lastAt: 200 }
        ]);

        const user2Stats = await fetchStats('user-2');
        expect(user2Stats.runs).toEqual(1);
        expect(user2Stats.ok).toEqual(1);
        expect(user2Stats.bySession['s-2'].runs).toEqual(1);
        expect(user2Stats.errors).toEqual([]);
    }

    @Test('stats route forbids access to sessions owned by others')
    async statsRouteForbidsOthersSessions() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sink = ((await createOrmSessionStore()).audit);
        const handler = new StatsHandler(sink, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/stats' && route.method === 'GET')!;

        let status = 0;
        let body = '';
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
        const req = {} as any;
        (req as any).url = '/api/stats?sessionId=s-1';
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });

        await route.handler(req, res, {} as any);
        expect(status).toEqual(403);
    }

    @Test('stats errors break ties by recency and cap at ten entries')
    async statsErrorsOrderedAndCapped() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sink = ((await createOrmSessionStore()).audit);
        // write_file 'boom' twice, read_file 'nope' once, plus nine more distinct
        // errors to overflow the top-N cap.
        await sink.append({ id: 'e1', sessionId: 's-1', toolName: 'write_file', toolCallId: 't1', status: 'error', error: 'boom', createdAt: 200 });
        await sink.append({ id: 'e2', sessionId: 's-1', toolName: 'read_file', toolCallId: 't2', status: 'error', error: 'nope', createdAt: 300 });
        await sink.append({ id: 'e3', sessionId: 's-1', toolName: 'write_file', toolCallId: 't3', status: 'error', error: 'boom', createdAt: 500 });
        for (let index = 0; index < 9; index++) {
            await sink.append({ id: `e4-${index}`, sessionId: 's-1', toolName: 'other', toolCallId: `t4-${index}`, status: 'error', error: `err-${index}`, createdAt: 600 + index });
        }

        const handler = new StatsHandler(sink, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/stats' && route.method === 'GET')!;
        let body = '';
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-x', principalId: 'user-1' });
        await route.handler(req, res, {} as any);
        const stats = JSON.parse(body);

        expect(stats.errors.length).toEqual(10);
        expect(stats.errors[0]).toEqual({ toolName: 'write_file', error: 'boom', count: 2, lastAt: 500 });
        expect(stats.errors[1]).toEqual({ toolName: 'read_file', error: 'nope', count: 1, lastAt: 300 });
    }

    @Test('stats byDay buckets records by UTC day')
    async statsBucketsByDay() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sink = ((await createOrmSessionStore()).audit);
        await sink.append({ id: 'd1', sessionId: 's-1', toolName: 'read_file', toolCallId: 't1', status: 'success', createdAt: Date.parse('2026-07-01T12:00:00Z') });
        await sink.append({ id: 'd2', sessionId: 's-1', toolName: 'read_file', toolCallId: 't2', status: 'success', createdAt: Date.parse('2026-07-02T12:00:00Z') });
        await sink.append({ id: 'd3', sessionId: 's-1', toolName: 'read_file', toolCallId: 't3', status: 'error', error: 'x', createdAt: Date.parse('2026-07-02T18:00:00Z') });

        const handler = new StatsHandler(sink, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/stats' && route.method === 'GET')!;
        let body = '';
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-x', principalId: 'user-1' });
        await route.handler(req, res, {} as any);
        const stats = JSON.parse(body);

        expect(stats.byDay['2026-07-01'].runs).toEqual(1);
        expect(stats.byDay['2026-07-02'].runs).toEqual(2);
        expect(stats.byDay['2026-07-02'].fail).toEqual(1);
    }
}

@Suite('ToolsHandler')
export class ToolsHandlerTest {
    @Test('lists registered agent-tools definitions through api route')
    async listsRegisteredAgentTools() {        const registry = new LocalToolRegistry([
            new ReadFileTool({ file: { rootDir: process.cwd() } })
        ], ((await createOrmSessionStore()).memory) as any, ((await createOrmSessionStore()).store) as any, undefined as any);
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
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
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
        const profiles: Array<string | undefined> = [];
        const runtime = {
            async *runStreamingTurn(_sessionId?: string, _input?: string, _principalId?: string, _message?: any, profile?: string) {
                profiles.push(profile);
                yield { type: 'text', content: 'hel' };
                yield { type: 'text', content: 'lo' };
                yield { type: 'done' };
            },
            async getMessages() {
                return [{ id: '1', role: 'assistant', content: 'hello', createdAt: 1 }];
            }
        } as any;
        const { store } = await createOrmSessionStore();
        const ws = new ChatWebSocket(runtime, new SessionOwnerStore(store), new (require('../src/auth/SessionQueue').SessionQueue)());
        const socket = {
            write: (buffer: Buffer) => {
                const payloadLength = buffer[1] & 0x7f;
                const offset = payloadLength < 126 ? 2 : 4;
                writes.push(buffer.subarray(offset).toString('utf8'));
                return true;
            }
        } as any;

        await (ws as any).handleMessage(socket, JSON.stringify({ content: 'hello', profile: 'strong' }), 's1');
        await new Promise(resolve => setTimeout(resolve, 0));

        const frames = writes.map(value => JSON.parse(value));
        expect(frames.map(frame => frame.type)).toEqual(['chunk', 'chunk', 'message', 'done']);
        expect(frames[0].content).toEqual('hel');
        expect(frames[1].content).toEqual('lo');
        expect(frames[2].content).toEqual('hello');
        expect(profiles).toEqual(['strong']);
    }

    @Test('rejects resuming a foreign session id')
    async rejectsForeignSessionResume() {
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
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

@Suite('ReviewHandler')
export class ReviewHandlerTest {
    @Test('lists review runs for owned session and supports commit filtering')
    async listsReviewRunsForOwnedSession() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        const reviews = {
            async list(sessionId?: string, commit?: string) {
                const runs = [{
                    id: 'r1', sessionId: 's1', base: 'HEAD', files: ['a.ts'],
                    findings: [{ id: 'f1', category: 'risk', severity: 'warning', summary: 'x' }],
                    commitSha: 'abc123', createdAt: 1
                }, {
                    id: 'r2', sessionId: 's1', base: 'HEAD~1', files: ['b.ts'],
                    findings: [], commitSha: 'def456', createdAt: 2
                }, {
                    id: 'r3', sessionId: 's2', base: 'HEAD', files: ['c.ts'],
                    findings: [], commitSha: 'abc123', createdAt: 3
                }];
                return runs.filter(run => (!sessionId || run.sessionId === sessionId) && (!commit || run.commitSha === commit));
            }
        } as any;
        const handler = new ReviewHandler(reviews, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/reviews' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/reviews?sessionId=s1&commit=abc123' } as any;
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
        expect(data.runs.length).toEqual(1);
        expect(data.runs[0].id).toEqual('r1');
        expect(data.runs[0].findings[0].summary).toEqual('x');
    }

    @Test('gets a review run by id scoped to the session')
    async getsReviewRunById() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const reviews = {
            async get(id: string) {
                return id === 'r1'
                    ? { id: 'r1', sessionId: 's1', base: 'HEAD', files: ['a.ts'], findings: [], createdAt: 1 }
                    : null;
            }
        } as any;
        const handler = new ReviewHandler(reviews, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/reviews/:id' && route.method === 'GET')!;
        let body = '';
        let status = 0;
        const req = { url: '/api/reviews/r1?sessionId=s1' } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
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
        expect(status).toEqual(200);
        expect(JSON.parse(body).run.id).toEqual('r1');
    }

    @Test('rejects review access for another principal and missing session')
    async rejectsForeignAndMissingSessionReviewAccess() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new ReviewHandler({ list: async () => [], get: async () => null } as any, owners);

        const listRoute = handler.getRoutes().find(route => route.path === '/api/reviews' && route.method === 'GET')!;
        let listStatus = 0;
        const foreignReq = { url: '/api/reviews?sessionId=s1' } as any;
        setRequestAuth(foreignReq, { token: 'token-2', principalId: 'user-2' });
        const foreignRes = {
            writeHead: (code: number) => {
                listStatus = code;
                return foreignRes;
            },
            end: () => foreignRes
        } as any;
        await listRoute.handler(foreignReq, foreignRes, {} as any);
        expect(listStatus).toEqual(403);

        let missingStatus = 0;
        const missingReq = { url: '/api/reviews' } as any;
        setRequestAuth(missingReq, { token: 'token-1', principalId: 'user-1' });
        const missingRes = {
            writeHead: (code: number) => {
                missingStatus = code;
                return missingRes;
            },
            end: () => missingRes
        } as any;
        await listRoute.handler(missingReq, missingRes, {} as any);
        expect(missingStatus).toEqual(400);
    }
}

@Suite('CompactionHistoryHandler')
export class CompactionHistoryHandlerTest {
    @Test('lists compaction history records for owned session and supports level filtering')
    async listsCompactionHistoryForOwnedSession() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        const compactionHistory = {
            async list(sessionId?: string, options?: { limit?: number; offset?: number }) {
                const records = [{
                    id: 'c1',
                    sessionId: 's1',
                    strategy: 'compacted',
                    compactionTriggered: true,
                    level: 'light',
                    summaryInserted: true,
                    beforeMessageCount: 20,
                    afterMessageCount: 10,
                    beforeTokens: 8000,
                    afterTokens: 4000,
                    compactedMessageCount: 10,
                    preservedAnchorCount: 2,
                    recentMessageCount: 4,
                    prunedMessageCount: 0,
                    toolMessagesCompacted: 0,
                    compressionRatio: 50,
                    cumulativeTokenSavings: 4000,
                    replayed: false,
                    createdAt: 1
                }, {
                    id: 'c2',
                    sessionId: 's1',
                    strategy: 'compacted',
                    compactionTriggered: true,
                    level: 'deep',
                    summaryInserted: true,
                    beforeMessageCount: 30,
                    afterMessageCount: 8,
                    beforeTokens: 12000,
                    afterTokens: 3000,
                    compactedMessageCount: 22,
                    preservedAnchorCount: 2,
                    recentMessageCount: 4,
                    prunedMessageCount: 0,
                    toolMessagesCompacted: 0,
                    compressionRatio: 75,
                    cumulativeTokenSavings: 9000,
                    replayed: false,
                    createdAt: 2
                }, {
                    id: 'c3',
                    sessionId: 's2',
                    strategy: 'pruned',
                    compactionTriggered: true,
                    level: 'light',
                    summaryInserted: false,
                    beforeMessageCount: 15,
                    afterMessageCount: 10,
                    beforeTokens: 5000,
                    afterTokens: 3000,
                    compactedMessageCount: 0,
                    preservedAnchorCount: 0,
                    recentMessageCount: 4,
                    prunedMessageCount: 5,
                    toolMessagesCompacted: 0,
                    compressionRatio: 40,
                    cumulativeTokenSavings: 2000,
                    replayed: false,
                    createdAt: 3
                }];
                return records.filter(record => !sessionId || record.sessionId === sessionId);
            }
        } as any;
        const handler = new CompactionHistoryHandler(compactionHistory, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/compaction-history' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/compaction-history?sessionId=s1&level=deep' } as any;
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
        expect(data.records[0].id).toEqual('c2');
        expect(data.records[0].compressionRatio).toEqual(75);
        expect(data.records[0].level).toEqual('deep');
    }

    @Test('rejects compaction history access for another principal')
    async rejectsForeignCompactionHistoryAccess() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new CompactionHistoryHandler({ list: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/compaction-history' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/compaction-history?sessionId=s1' } as any;
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

    @Test('requires sessionId for compaction history access')
    async requiresSessionId() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const handler = new CompactionHistoryHandler({ list: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/compaction-history' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/compaction-history' } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
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

    @Test('returns compaction history stats across sessions')
    async returnsCompactionHistoryStats() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const handler = new CompactionHistoryHandler({
            list: async () => [],
            async aggregate(sessionId?: string) {
                return sessionId
                    ? [{ sessionId: 's1', recordCount: 1, compactedCount: 1, prunedCount: 0, avgCompressionRatio: 50, totalTokensBefore: 8000, totalTokensAfter: 4000, totalTokensSaved: 4000, timeRange: { from: 1, to: 1 } }]
                    : [{ sessionId: 's1', recordCount: 1, compactedCount: 1, prunedCount: 0, avgCompressionRatio: 50, totalTokensBefore: 8000, totalTokensAfter: 4000, totalTokensSaved: 4000, timeRange: { from: 1, to: 1 } }];
            }
        } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/compaction-history/stats' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/compaction-history/stats' } as any;
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
        expect(data.aggregates.length).toEqual(1);
        expect(data.aggregates[0].sessionId).toEqual('s1');
        expect(data.aggregates[0].totalTokensSaved).toEqual(4000);
        expect(data.aggregates[0].timeRange).toEqual({ from: 1, to: 1 });
    }

    @Test('rejects foreign compaction history stats access')
    async rejectsForeignCompactionHistoryStats() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new CompactionHistoryHandler({ list: async () => [], aggregate: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/compaction-history/stats' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/compaction-history/stats?sessionId=s1' } as any;
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

    @Test('returns compaction history trend across sessions')
    async returnsCompactionHistoryTrend() {
        const day = 24 * 60 * 60 * 1000;
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const handler = new CompactionHistoryHandler({
            list: async () => [],
            aggregate: async () => [],
            async trend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }) {
                const bucketSize = options?.bucketSize ?? day;
                return [
                    { sessionId: 's1', bucketStart: 2 * day, recordCount: 2, compactedCount: 1, prunedCount: 1, avgCompressionRatio: 30, totalTokensBefore: 9000, totalTokensAfter: 4900, totalTokensSaved: 4100 }
                ].filter(point => !sessionId || point.sessionId === sessionId);
            }
        } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/compaction-history/trend' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/compaction-history/trend?bucketSize=172800000' } as any;
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
        expect(data.trend.length).toEqual(1);
        expect(data.trend[0].sessionId).toEqual('s1');
        expect(data.trend[0].bucketStart).toEqual(2 * day);
        expect(data.trend[0].totalTokensSaved).toEqual(4100);
        expect(data.trend[0].avgCompressionRatio).toEqual(30);
    }

    @Test('rejects foreign compaction history trend access')
    async rejectsForeignCompactionHistoryTrend() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new CompactionHistoryHandler({ list: async () => [], aggregate: async () => [], trend: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/compaction-history/trend' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/compaction-history/trend?sessionId=s1' } as any;
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

@Suite('SummaryQualityHandler')
export class SummaryQualityHandlerTest {
    @Test('lists summary quality records with provider and limit filtering')
    async listsSummaryQualityRecords() {
        const quality = {
            async list(options?: { provider?: string; limit?: number }) {
                const provider = options?.provider;
                const limit = options?.limit ?? 200;
                return [
                    { id: 'q1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, evidenceCoverage: 100, createdAt: 1 },
                    { id: 'q2', provider: 'anthropic', total: 70, fieldCompleteness: 80, annotationQuality: 50, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, evidenceCoverage: 50, createdAt: 2 }
                ].filter(record => !provider || record.provider === provider).slice(0, limit);
            }
        } as any;
        const handler = new SummaryQualityHandler(quality);
        const route = handler.getRoutes().find(route => route.path === '/api/summary-quality' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/summary-quality?provider=deepseek&limit=1' } as any;
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
        expect(data.records[0].id).toEqual('q1');
        expect(data.records[0].provider).toEqual('deepseek');
        expect(data.records[0].model).toEqual('deepseek-v4-flash');
        expect(data.records[0].fallbackUsed).toEqual(false);
        expect(data.records[0].evidenceCoverage).toEqual(100);
    }

    @Test('lists all summary quality records when no filter is provided')
    async listsAllSummaryQualityRecords() {
        const quality = {
            async list() {
                return [
                    { id: 'q1', provider: 'deepseek', model: null, total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, evidenceCoverage: 80, createdAt: 1 }
                ];
            }
        } as any;
        const handler = new SummaryQualityHandler(quality);
        const route = handler.getRoutes().find(route => route.path === '/api/summary-quality' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/summary-quality' } as any;
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
        expect(data.records[0].model).toEqual(null);
        expect(data.records[0].evidenceCoverage).toEqual(80);
    }

    @Test('aggregates summary quality stats with optional provider scope')
    async aggregatesSummaryQualityStats() {
        const quality = {
            async aggregate(provider?: string) {
                return provider
                    ? [{ provider, recordCount: 2, avgTotal: 80, minTotal: 60, maxTotal: 100, avgFieldCompleteness: 90, avgAnnotationQuality: 75, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 100, timeRange: { from: 1, to: 2 } }]
                    : [
                        { provider: 'deepseek', recordCount: 2, avgTotal: 80, minTotal: 60, maxTotal: 100, avgFieldCompleteness: 90, avgAnnotationQuality: 75, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 50, timeRange: { from: 1, to: 2 } },
                        { provider: 'anthropic', recordCount: 1, avgTotal: 70, minTotal: 70, maxTotal: 70, avgFieldCompleteness: 80, avgAnnotationQuality: 50, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 100, timeRange: { from: 2, to: 2 } }
                    ];
            }
        } as any;
        const handler = new SummaryQualityHandler(quality);
        const route = handler.getRoutes().find(route => route.path === '/api/summary-quality/stats' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/summary-quality/stats?provider=anthropic' } as any;
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.aggregates.length).toEqual(1);
        expect(data.aggregates[0].provider).toEqual('anthropic');
        expect(data.aggregates[0].fallbackRate).toEqual(100);
    }

    @Test('builds summary quality trend with provider and bucketing params')
    async buildsSummaryQualityTrendOverHttp() {
        const quality = {
            async list(options?: { provider?: string; limit?: number }) {
                const provider = options?.provider;
                const day = 24 * 60 * 60 * 1000;
                return [
                    { id: 'q1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 75, fieldCompleteness: 90, annotationQuality: 70, lengthBalance: 80, truncationScore: 100, fallbackUsed: true, summaryLength: 230, evidenceCoverage: 60, createdAt: 1 },
                    { id: 'q2', provider: 'deepseek', model: 'deepseek-v4-flash', total: 90, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 240, evidenceCoverage: 100, createdAt: day + 1 },
                    { id: 'q3', provider: 'anthropic', model: null, total: 50, fieldCompleteness: 60, annotationQuality: 40, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 190, evidenceCoverage: 0, createdAt: day + 2 }
                ].filter(record => !provider || record.provider === provider).slice(0, options?.limit ?? 500);
            }
        } as any;
        const handler = new SummaryQualityHandler(quality);
        const route = handler.getRoutes().find(route => route.path === '/api/summary-quality/trend' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/summary-quality/trend?provider=deepseek&maxBuckets=7' } as any;
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(Array.isArray(data.trend)).toEqual(true);
        expect(data.trend.length).toEqual(2);
        expect(data.trend[0].provider).toEqual('deepseek');
        expect(data.trend[0].recordCount).toEqual(1);
        expect(data.trend[0].avgTotal).toEqual(75);
        expect(data.trend[0].fallbackRate).toEqual(100);
        expect(data.trend[0].avgEvidenceCoverage).toEqual(60);
        expect(data.trend[1].bucketStart).toEqual(24 * 60 * 60 * 1000);
        expect(data.trend[1].avgTotal).toEqual(90);
        expect(data.trend[1].fallbackRate).toEqual(0);
        expect(data.trend[1].avgEvidenceCoverage).toEqual(100);
        expect(data.trend[0].avgAnnotationQuality).toEqual(70);
        expect(typeof data.trend[0].minTotal).toEqual('number');
        expect(typeof data.trend[0].maxTotal).toEqual('number');
    }

    @Test('builds summary quality trend across all providers when no filter provided')
    async buildsSummaryQualityTrendOverHttpAllProviders() {
        const quality = {
            async list(options?: { provider?: string; limit?: number }) {
                return [
                    { id: 'q1', provider: 'deepseek', model: null, total: 80, fieldCompleteness: 90, annotationQuality: 80, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 220, evidenceCoverage: 75, createdAt: 1 },
                    { id: 'q2', provider: 'anthropic', model: null, total: 60, fieldCompleteness: 70, annotationQuality: 60, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 200, evidenceCoverage: 25, createdAt: 1 }
                ].slice(0, options?.limit ?? 500);
            }
        } as any;
        const handler = new SummaryQualityHandler(quality);
        const route = handler.getRoutes().find(route => route.path === '/api/summary-quality/trend' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/summary-quality/trend' } as any;
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.trend.length).toEqual(2);
        expect(new Set(data.trend.map((point: any) => point.provider))).toEqual(new Set(['deepseek', 'anthropic']));
    }

    @Test('filters summary quality trend by model over http')
    async filtersSummaryQualityTrendByModelOverHttp() {
        const quality = {
            async list(options?: { provider?: string; model?: string; limit?: number }) {
                const day = 24 * 60 * 60 * 1000;
                return [
                    { id: 'q1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, createdAt: 1 },
                    { id: 'q2', provider: 'deepseek', model: 'deepseek-v4-flash', total: 60, fieldCompleteness: 80, annotationQuality: 60, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, createdAt: day + 1 },
                    { id: 'q3', provider: 'deepseek', model: 'deepseek-v3', total: 80, fieldCompleteness: 90, annotationQuality: 90, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 220, createdAt: 3 }
                ].filter(record => (!options?.provider || record.provider === options.provider)
                    && (!options?.model || record.model === options.model)).slice(0, options?.limit ?? 500);
            }
        } as any;
        const handler = new SummaryQualityHandler(quality);
        const route = handler.getRoutes().find(route => route.path === '/api/summary-quality/trend' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/summary-quality/trend?provider=deepseek&model=deepseek-v4-flash' } as any;
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.trend.length).toEqual(2);
        expect(data.trend.every((point: any) => point.provider === 'deepseek')).toEqual(true);
        expect(data.trend[0].avgTotal).toEqual(92);
        expect(data.trend[1].avgTotal).toEqual(60);
        expect(data.trend[1].fallbackRate).toEqual(100);
    }
}

@Suite('TurnDiagnosticsHandler')
export class TurnDiagnosticsHandlerTest {
    @Test('lists turn diagnostics records for owned session')
    async listsTurnDiagnosticsForOwnedSession() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        const diagnostics = {
            async list(sessionId?: string, options?: { limit?: number; offset?: number }) {
                const records = [{
                    id: 't1',
                    sessionId: 's1',
                    createdAt: 1,
                    emptyResponseRetryCount: 0,
                    followUpRecoveryCount: 0,
                    followUpContextRewritten: false,
                    finalAssistantWasClarification: false,
                    repeatedClarificationDetected: false,
                    compactionCount: 0,
                    totalTokenSavings: 0,
                    compressionRatio: null,
                    compactionLevel: null,
                    promptCache: null
                }, {
                    id: 't2',
                    sessionId: 's1',
                    createdAt: 2,
                    emptyResponseRetryCount: 2,
                    followUpRecoveryCount: 1,
                    followUpContextRewritten: true,
                    finalAssistantWasClarification: true,
                    repeatedClarificationDetected: true,
                    compactionCount: 1,
                    totalTokenSavings: 4000,
                    compressionRatio: 50,
                    compactionLevel: 'light',
                    promptCache: null
                }];
                return records.filter(record => !sessionId || record.sessionId === sessionId);
            },
            async aggregate() {
                return { totalTurns: 0 };
            }
        } as any;
        const handler = new TurnDiagnosticsHandler(diagnostics, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/turn-diagnostics?sessionId=s1' } as any;
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
        expect(data.records.length).toEqual(2);
        expect(data.records[1].repeatedClarificationDetected).toEqual(true);
        expect(data.records[1].compactionLevel).toEqual('light');
    }

    @Test('rejects turn diagnostics access for another principal')
    async rejectsForeignTurnDiagnosticsAccess() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new TurnDiagnosticsHandler({ list: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/turn-diagnostics?sessionId=s1' } as any;
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

    @Test('requires sessionId for turn diagnostics access')
    async requiresSessionId() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const handler = new TurnDiagnosticsHandler({ list: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/turn-diagnostics' } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
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

    @Test('lists workspace diagnostics across owned sessions newest first')
    async listsWorkspaceDiagnosticsForOwnedSessions() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-1');
        await owners.create('s3', 'user-2');
        const diagnostics = {
            async list(sessionId?: string, options?: { limit?: number; workspaceId?: string; order?: 'ASC' | 'DESC' }) {
                const records = [
                    { id: 't1', sessionId: 's1', workspaceId: '/ws/x', createdAt: 1, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0, compressionRatio: null, compactionLevel: null, promptCache: null },
                    { id: 't2', sessionId: 's2', workspaceId: '/ws/x', createdAt: 2, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0, compressionRatio: null, compactionLevel: null, promptCache: null },
                    { id: 't3', sessionId: 's3', workspaceId: '/ws/x', createdAt: 3, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0, compressionRatio: null, compactionLevel: null, promptCache: null },
                    { id: 't4', sessionId: 's1', workspaceId: '/ws/y', createdAt: 4, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0, compressionRatio: null, compactionLevel: null, promptCache: null }
                ];
                let result = records;
                if (sessionId) {
                    result = result.filter(record => record.sessionId === sessionId);
                }
                if (options?.workspaceId) {
                    result = result.filter(record => record.workspaceId === options.workspaceId);
                }
                if (options?.order === 'DESC') {
                    result = [...result].sort((a, b) => b.createdAt - a.createdAt);
                }
                if (options?.limit) {
                    result = result.slice(0, options.limit);
                }
                return result;
            }
        } as any;
        const handler = new TurnDiagnosticsHandler(diagnostics, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics/workspace' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/turn-diagnostics/workspace?workspaceId=%2Fws%2Fx' } as any;
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
        expect(data.workspaceId).toEqual('/ws/x');
        expect(data.records.map((record: any) => record.id)).toEqual(['t2', 't1']);
        expect(data.records[0].workspaceId).toEqual('/ws/x');
        expect(data.records.every((record: any) => record.sessionId !== 's3')).toEqual(true);
    }

    @Test('requires workspaceId for workspace turn diagnostics access')
    async requiresWorkspaceId() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const handler = new TurnDiagnosticsHandler({ list: async () => [] } as any, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics/workspace' && route.method === 'GET')!;
        let status = 0;
        const req = { url: '/api/turn-diagnostics/workspace' } as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
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

    @Test('workspace diagnostics exclude records from sessions owned by other principals')
    async excludesForeignSessionsFromWorkspaceList() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-1');
        await owners.create('s3', 'user-2');
        const diagnostics = {
            async list(sessionId?: string, options?: { limit?: number; workspaceId?: string; order?: 'ASC' | 'DESC' }) {
                const records = [
                    { id: 't1', sessionId: 's1', workspaceId: '/ws/x', createdAt: 1, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0, compressionRatio: null, compactionLevel: null, promptCache: null },
                    { id: 't3', sessionId: 's3', workspaceId: '/ws/x', createdAt: 3, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0, compressionRatio: null, compactionLevel: null, promptCache: null }
                ];
                let result = records;
                if (sessionId) {
                    result = result.filter(record => record.sessionId === sessionId);
                }
                if (options?.workspaceId) {
                    result = result.filter(record => record.workspaceId === options.workspaceId);
                }
                if (options?.order === 'DESC') {
                    result = [...result].sort((a, b) => b.createdAt - a.createdAt);
                }
                if (options?.limit) {
                    result = result.slice(0, options.limit);
                }
                return result;
            }
        } as any;
        const handler = new TurnDiagnosticsHandler(diagnostics, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics/workspace' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/turn-diagnostics/workspace?workspaceId=%2Fws%2Fx' } as any;
        setRequestAuth(req, { token: 'token-2', principalId: 'user-2' });
        const res = {
            writeHead: () => res,
            end: (value?: string) => {
                body = value ?? '';
                return res;
            }
        } as any;

        await route.handler(req, res, {} as any);
        const data = JSON.parse(body);
        expect(data.records.map((record: any) => record.id)).toEqual(['t3']);
    }

    @Test('aggregates turn diagnostics scoped to an owned session')
    async aggregatesScopedStats() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const diagnostics = {
            async aggregate(sessionIds?: string[]) {
                return {
                    sessionIds,
                    totalTurns: 3,
                    emptyResponseCount: 1,
                    emptyResponseRate: 33.3,
                    repeatedClarificationCount: 1,
                    repeatedQuestionRate: 33.3,
                    finalClarificationCount: 1,
                    clarificationRate: 33.3,
                    followUpRecoveryCount: 4,
                    followUpRecoveryRate: 133.3,
                    compactionCount: 1,
                    totalTokenSavings: 4000,
                    timeRange: { from: 1, to: 3 }
                };
            }
        } as any;
        const handler = new TurnDiagnosticsHandler(diagnostics, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics/stats' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/turn-diagnostics/stats?sessionId=s1' } as any;
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
        expect(data.aggregate.totalTurns).toEqual(3);
        expect(data.aggregate.emptyResponseRate).toEqual(33.3);
        expect(data.aggregate.sessionIds).toEqual(['s1']);
    }

    @Test('aggregates turn diagnostics across owned sessions without sessionId')
    async aggregatesOwnedStats() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        let requestedSessionIds: string[] | undefined;
        const diagnostics = {
            async list() {
                return [{ sessionId: 's1', id: 't1' }, { sessionId: 's2', id: 't2' }];
            },
            async aggregate(sessionIds?: string[]) {
                requestedSessionIds = sessionIds;
                return {
                    sessionIds,
                    totalTurns: 1,
                    emptyResponseCount: 0,
                    emptyResponseRate: 0,
                    repeatedClarificationCount: 0,
                    repeatedQuestionRate: 0,
                    finalClarificationCount: 0,
                    clarificationRate: 0,
                    followUpRecoveryCount: 0,
                    followUpRecoveryRate: 0,
                    compactionCount: 0,
                    totalTokenSavings: 0
                };
            }
        } as any;
        const handler = new TurnDiagnosticsHandler(diagnostics, owners);
        const route = handler.getRoutes().find(route => route.path === '/api/turn-diagnostics/stats' && route.method === 'GET')!;
        let body = '';
        const req = { url: '/api/turn-diagnostics/stats' } as any;
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
        expect(requestedSessionIds).toEqual(['s1']);
        expect(data.aggregate.totalTurns).toEqual(1);
    }

    @Test('returns usage stats through http')
    async usageStatsRoute() {
        const now = Date.now();
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('usage-http-1', 'user-1');
        await owners.create('usage-http-2', 'user-2');
        await store.append('usage-http-1', {
            id: 'usage-http-msg-1',
            role: 'assistant',
            content: 'done',
            createdAt: now - (12 * 60 * 60 * 1000),
            metadata: { usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 } }
        } as any);
        await store.append('usage-http-1', {
            id: 'usage-http-msg-2',
            role: 'assistant',
            content: 'done',
            createdAt: now - (3 * 24 * 60 * 60 * 1000),
            metadata: { usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 } }
        } as any);
        await store.append('usage-http-2', {
            id: 'usage-http-msg-3',
            role: 'assistant',
            content: 'done',
            createdAt: now - (6 * 60 * 60 * 1000),
            metadata: { usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 } }
        } as any);
        const diagnostics = {
            async list() {
                return [
                    { sessionId: 'usage-http-1', createdAt: now - (12 * 60 * 60 * 1000) },
                    { sessionId: 'usage-http-1', createdAt: now - (3 * 24 * 60 * 60 * 1000) },
                    { sessionId: 'usage-http-2', createdAt: now - (6 * 60 * 60 * 1000) }
                ];
            }
        } as any;
        const handler = new UsageHandler(store, owners, diagnostics);
        const route = handler.getRoutes().find(route => route.path === '/api/usage' && route.method === 'GET')!;
        let body = '';
        const req = { url: `/api/usage?range=cumulative&since=${now - (24 * 60 * 60 * 1000)}` } as any;
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
        expect(data.usage.daily.turns).toEqual(1);
        expect(data.usage.daily.totalTokens).toEqual(20);
        expect(data.usage.weekly.turns).toEqual(1);
        expect(data.usage.weekly.totalTokens).toEqual(20);
        expect(data.usage.cumulative.turns).toEqual(1);
        expect(data.usage.cumulative.totalTokens).toEqual(20);
        expect(data.usage.cumulative.sessions).toEqual(1);
        expect(data.range).toEqual('cumulative');
        expect(data.selected.turns).toEqual(1);
    }
}

@Suite('MemoryHandler')
export class MemoryHandlerTest {
    @Test('lists only memory for owned sessions')
    async listsOwnedSessionMemory() {
        const runtime = { putMemory: async () => null } as any;
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
        const runtime = {
            putMemory: async () => {
                called = true;
                return null;
            }
        } as any;
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        await owners.create('s2', 'user-2');
        const securedHandler = new MemoryHandler(runtime, ((await createOrmSessionStore()).memory), store, owners);
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
        const { store } = await createOrmSessionStore();
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
        const { store } = await createOrmSessionStore();
        const runtime = {
            putMemory: async () => {
                called = true;
                return null;
            }
        } as any;
        const owners = new SessionOwnerStore(store);
        await owners.create('s1', 'user-1');
        const handler = new MemoryHandler(runtime, ((await createOrmSessionStore()).memory), store, owners);
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
    @Test('records question answers idempotently per session')
    async recordsQuestionAnswersIdempotently() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const runtime = { async getMessages() { return []; } } as any;
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, {} as any, owners, new SessionHandler(runtime, store, owners), new EventHandler(owners));
        await store.get('question-s1');
        await owners.create('question-s1', 'user-1');
        const request = { jsonrpc: '2.0' as const, id: 1, method: 'question.answer', params: { sessionId: 'question-s1', questionId: 'q1', action: 'answer', answer: 'postgres' } };
        const first = await rpc.handle(request, { principalId: 'user-1' }) as any;
        const second = await rpc.handle(request, { principalId: 'user-1' }) as any;
        expect(first.result).toMatchObject({ questionId: 'q1', status: 'answered', answer: 'postgres', duplicate: false });
        expect(second.result).toMatchObject({ questionId: 'q1', duplicate: true });
        const list = await rpc.handle({ jsonrpc: '2.0', id: 2, method: 'question.list', params: { sessionId: 'question-s1' } }, { principalId: 'user-1' }) as any;
        expect(list.result).toHaveLength(1);
    }

    @Test('timeline.query projects aggregated entries and timeline.replay pages raw events idempotently')
    async queriesAndReplaysTimeline() {
        const { store, memory, timeline } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const runtime = { async getMessages() { return []; } } as any;
        const events = new EventHandler(owners, timeline);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, {} as any, owners, new SessionHandler(runtime, store, owners), events, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, timeline);
        await owners.create('timeline-s1', 'user-1');
        const sid = 'timeline-s1';
        await events.onToolInvoked(new AgentToolInvokedEvent({}, sid, 'bash', { cmd: 'ls' }, {
            receiptId: 'rc1', toolCallId: 'tc1', toolName: 'bash', executionMode: 'sequential', status: 'running'
        }));
        await events.onToolCompleted(new AgentToolCompletedEvent({}, sid, 'bash', 'ok', {
            receiptId: 'rc1', toolCallId: 'tc1', toolName: 'bash', executionMode: 'sequential', status: 'success', durationMs: 12, outputSummary: 'ok'
        }));
        await events.onTurnStarted(new AgentTurnStartedEvent({}, sid, 'hello'));
        await new Promise(resolve => setTimeout(resolve, 100));

        const query1 = await rpc.handle({ jsonrpc: '2.0', id: 1, method: 'timeline.query', params: { sessionId: sid } }, { principalId: 'user-1' }) as any;
        const entries = query1.result.entries;
        expect(query1.result.hasMore).toBe(false);
        const toolEntries = entries.filter((entry: any) => entry.kind === 'tool');
        expect(toolEntries.length).toEqual(1);
        expect(toolEntries[0].key).toEqual('tool:tc1');
        expect(toolEntries[0].status).toEqual('success');
        expect(toolEntries[0].durationMs).toEqual(12);

        const replay1 = await rpc.handle({ jsonrpc: '2.0', id: 2, method: 'timeline.replay', params: { sessionId: sid, sinceSeq: 0 } }, { principalId: 'user-1' }) as any;
        const replay2 = await rpc.handle({ jsonrpc: '2.0', id: 3, method: 'timeline.replay', params: { sessionId: sid, sinceSeq: 0 } }, { principalId: 'user-1' }) as any;
        expect(replay1.result.events).toEqual(replay2.result.events);
        expect(replay1.result.events.length).toBeGreaterThan(0);

        const paged = await rpc.handle({ jsonrpc: '2.0', id: 4, method: 'timeline.query', params: { sessionId: sid, limit: 1 } }, { principalId: 'user-1' }) as any;
        expect(paged.result.entries.length).toEqual(1);
        expect(paged.result.hasMore).toBe(true);
        expect(paged.result.nextCursor).toBeDefined();

        const forbidden = await rpc.handle({ jsonrpc: '2.0', id: 5, method: 'timeline.query', params: { sessionId: sid } }, { principalId: 'other' });
        expect((forbidden as any).error).toBeDefined();

        const forbiddenReplay = await rpc.handle({ jsonrpc: '2.0', id: 6, method: 'timeline.replay', params: { sessionId: sid, sinceSeq: 0 } }, { principalId: 'other' });
        expect((forbiddenReplay as any).error).toBeDefined();
    }

    @Test('nav.query returns a principal-scoped session tree and applies filters through json-rpc')
    async queriesNavTreeThroughJsonRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const runtime = { async getMessages() { return []; } } as any;
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, {} as any, owners, new SessionHandler(runtime, store, owners), new EventHandler(owners));

        await store.get('nav-s1');
        await owners.create('nav-s1', 'user-1');
        await store.setProjectMetadata('nav-s1', { projectId: 'alpha', primaryThreadId: 'thread-1', sessionRole: 'main', rootRequest: 'Build widget' });
        await store.setWorkspace('nav-s1', '/w1');
        await store.setTitle('nav-s1', 'Widget session');
        await store.setPinned('nav-s1', true);

        await store.get('nav-s2');
        await owners.create('nav-s2', 'user-1');
        await store.setProjectMetadata('nav-s2', { projectId: 'alpha', primaryThreadId: 'thread-2', sessionRole: 'worker', rootRequest: 'Review widget' });
        await store.setWorkspace('nav-s2', '/w1');
        await store.setTitle('nav-s2', 'Widget review');

        await store.get('nav-other');
        await owners.create('nav-other', 'user-2');
        await store.setProjectMetadata('nav-other', { projectId: 'secret', primaryThreadId: 'thread-x', sessionRole: 'main' });
        await store.setWorkspace('nav-other', '/w2');

        const query1 = await rpc.handle({ jsonrpc: '2.0', id: 1, method: 'nav.query', params: {} }, { principalId: 'user-1' }) as any;
        expect(query1.result.totalSessions).toEqual(2);
        expect(query1.result.totalProjects).toEqual(1);
        expect(query1.result.totalThreads).toEqual(2);
        expect(query1.result.sessions.map((node: any) => node.id).sort()).toEqual(['nav-s1', 'nav-s2']);
        expect(query1.result.sessions.some((node: any) => node.projectId === 'secret')).toBe(false);
        const project = query1.result.projects.find((node: any) => node.id === 'project:alpha');
        expect(project).toBeDefined();
        expect(project.children.map((child: any) => child.id).sort()).toEqual(['nav-s1', 'nav-s2']);
        expect(query1.result.threads.map((node: any) => node.id)).toEqual(expect.arrayContaining(['thread-1', 'thread-2']));

        const pinned = await rpc.handle({ jsonrpc: '2.0', id: 2, method: 'nav.query', params: { filter: { pinnedOnly: true } } }, { principalId: 'user-1' }) as any;
        expect(pinned.result.totalSessions).toEqual(1);
        expect(pinned.result.sessions[0].id).toEqual('nav-s1');

        const byProject = await rpc.handle({ jsonrpc: '2.0', id: 3, method: 'nav.query', params: { filter: { projectId: 'alpha' } } }, { principalId: 'user-1' }) as any;
        expect(byProject.result.sessions.map((node: any) => node.id).sort()).toEqual(['nav-s1', 'nav-s2']);

        const byText = await rpc.handle({ jsonrpc: '2.0', id: 4, method: 'nav.query', params: { filter: { text: 'review' } } }, { principalId: 'user-1' }) as any;
        expect(byText.result.totalSessions).toEqual(1);
        expect(byText.result.sessions[0].id).toEqual('nav-s2');

        await store.setArchived('nav-s2', true);
        const defaultQuery = await rpc.handle({ jsonrpc: '2.0', id: 5, method: 'nav.query', params: {} }, { principalId: 'user-1' }) as any;
        expect(defaultQuery.result.sessions.map((node: any) => node.id)).toEqual(['nav-s1']);
        const withArchived = await rpc.handle({ jsonrpc: '2.0', id: 6, method: 'nav.query', params: { includeArchived: true } }, { principalId: 'user-1' }) as any;
        expect(withArchived.result.sessions.map((node: any) => node.id).sort()).toEqual(['nav-s1', 'nav-s2']);

        const other = await rpc.handle({ jsonrpc: '2.0', id: 7, method: 'nav.query', params: {} }, { principalId: 'user-2' }) as any;
        expect(other.result.totalSessions).toEqual(1);
        expect(other.result.sessions[0].id).toEqual('nav-other');

        const caps = await rpc.handle({ jsonrpc: '2.0', id: 8, method: 'app.capabilities', params: {} }, { principalId: 'user-1' }) as any;
        expect((caps.result.methods as string[])).toContain('nav.query');
    }

    @Test('runs turns through shared json-rpc session flow')
    async runsTurnsThroughJsonRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const profiles: Array<string | undefined> = [];
        const runtime = {
            async runTurn(sessionId: string, input: string, _principalId?: string, _message?: any, profile?: string) {
                profiles.push(profile);
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,tools,owners,sessions,events);

        const runResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'run.turn',
            params: { sessionId: 'rpc-s1', input: 'hello', profile: 'strong' }
        }, { principalId: 'user-1' });
        expect((runResponse as any).result.sessionId).toEqual('rpc-s1');
        expect((runResponse as any).result.message.content).toEqual('done:hello');
        expect(profiles).toEqual(['strong']);

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

        await store.setProjectMetadata('rpc-s1', {
            projectId: 'exam-system',
            primaryThreadId: 'thread-rpc',
            originThreadId: 'root-rpc',
            sessionRole: 'branch',
            rootRequest: 'Build rpc system',
            focusSummary: 'RPC thread'
        });
        const threadResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 6,
            method: 'session.list_threads',
            params: {}
        }, { principalId: 'user-1' });
        expect((threadResponse as any).result[0].threadId).toEqual('thread-rpc');
        expect((threadResponse as any).result[0].projectId).toEqual('exam-system');
        expect((threadResponse as any).result[0].title).toEqual('RPC thread');
        expect((threadResponse as any).result[0].status).toEqual('active');
        expect((threadResponse as any).result[0].stage).toEqual('discovery');
        expect((threadResponse as any).result[0].originThreadId).toEqual('root-rpc');
        expect((threadResponse as any).result[0].sessions[0].id).toEqual('rpc-s1');

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
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

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
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

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
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{
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
            } as any);

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

    @Test('reports untrusted workspace and trusts through project.trust RPC')
    async projectTrustRoundTrip() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const runtime = { resolveSessionWorkspace: async () => '/tmp/workspace' } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const events = new EventHandler(runtime);
        const trustRoot = `${require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'tsioc-trust-rpc-'))}`;
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {
            ui: {
                title: 'Console',
                console: { workspace: '/tmp/workspace' }
            },
            trustedProjectsRoot: trustRoot,
            model: {
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                defaultProfile: 'flash'
            },
            bootstrapTurn: { sessionId: 'rpc-init' }
        } as any);
        try {
            const before = await rpc.handle({
                jsonrpc: '2.0',
                id: 1,
                method: 'project.trust_status',
                params: { workspace: '/tmp/workspace' }
            }, { principalId: 'user-1' });
            expect((before as any).result.trusted).toBe(false);
            const trust = await rpc.handle({
                jsonrpc: '2.0',
                id: 2,
                method: 'project.trust',
                params: { workspace: '/tmp/workspace' }
            }, { principalId: 'user-1' });
            expect((trust as any).result.trusted).toBe(true);
            const after = await rpc.handle({
                jsonrpc: '2.0',
                id: 3,
                method: 'project.trust_status',
                params: { workspace: '/tmp/workspace' }
            }, { principalId: 'user-1' });
            expect((after as any).result.trusted).toBe(true);
            const untrust = await rpc.handle({
                jsonrpc: '2.0',
                id: 4,
                method: 'project.trust',
                params: { workspace: '/tmp/workspace', untrust: true }
            }, { principalId: 'user-1' });
            expect((untrust as any).result.trusted).toBe(false);
        } finally {
            require('fs').rmSync(trustRoot, { recursive: true, force: true });
        }
    }

    @Test('creates fresh session through shared app state instead of reusing workspace sessions')
    async createsFreshSessionThroughSharedAppState() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{
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
            } as any);

        await owners.create('workspace-old', 'user-1');
        await store.setWorkspace('workspace-old', '/tmp/workspace');
        await store.append('workspace-old', { id: 'm1', role: 'user', content: 'old', createdAt: 1 } as any);

        await new Promise(resolve => setTimeout(resolve, 5));

        await owners.create('workspace-latest', 'user-1');
        await store.setWorkspace('workspace-latest', '/tmp/workspace');
        await store.append('workspace-latest', { id: 'm3', role: 'user', content: 'latest', createdAt: 3 } as any);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 8,
            method: 'app.state'
        }, { principalId: 'user-1' });

        const sessionId = String((response as any).result.sessionId || '');
        expect(sessionId).toMatch(/^chat[0-9a-f]{32}$/i);
        expect(sessionId).not.toEqual('workspace-latest');
        expect((response as any).result.workspace).toEqual('/tmp/workspace');
    }

    @Test('creates fresh chat session id when workspace has no prior session')
    async createsFreshChatSessionIdWhenWorkspaceHasNoPriorSession() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{
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
            } as any);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 9,
            method: 'app.state'
        }, { principalId: 'user-1' });

        const sessionId = String((response as any).result.sessionId || '');
        expect(sessionId).toMatch(/^chat[0-9a-f]{32}$/i);
        expect(sessionId).not.toEqual('default');
        expect(await owners.getOwner(sessionId)).toEqual('user-1');
    }

    @Test('lists and activates model profiles through json-rpc')
    async listsAndActivatesModelProfiles() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{
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
            } as any);

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
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{
                bootstrapTurn: {
                    sessionId: 'rpc-history'
                }
            } as any);

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

    @Test('queries console input history across workspace sessions through json-rpc')
    async queriesConsoleInputHistoryAcrossWorkspaceSessions() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{
                bootstrapTurn: {
                    sessionId: 'rpc-history-a'
                }
            } as any);

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
                workspace: '/tmp/shared-workspace'
            }
        }, { principalId: 'user-1' });

        const sessionB = await rpc.handle({
            jsonrpc: '2.0',
            id: 23,
            method: 'app.inputHistory.get',
            params: {
                workspace: '/tmp/shared-workspace'
            }
        }, { principalId: 'user-1' });

        expect((sessionA as any).result).toEqual(['session b', 'session a']);
        expect((sessionB as any).result).toEqual(['session b', 'session a']);
    }

    @Test('local-system input history query includes legacy anonymous workspace records')
    async localSystemInputHistoryQueryIncludesLegacyAnonymousRecords() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{
                bootstrapTurn: {
                    sessionId: 'rpc-history-local'
                }
            } as any);

        await memory.put({
            id: 'legacy-anonymous-history',
            key: 'agent-ui.console.input-history',
            value: JSON.stringify(['legacy prompt']),
            scope: 'global',
            metadata: {
                workspace: '/tmp/shared-workspace',
                principalId: 'anonymous',
                sessionId: 'legacy-session',
                kind: 'console-input-history'
            },
            createdAt: 1,
            updatedAt: 1
        } as any);

        await rpc.handle({
            jsonrpc: '2.0',
            id: 24,
            method: 'app.inputHistory.put',
            params: {
                sessionId: 'rpc-history-local',
                workspace: '/tmp/shared-workspace',
                entries: ['current prompt']
            }
        }, { principalId: 'local-system' });

        const localSystem = await rpc.handle({
            jsonrpc: '2.0',
            id: 25,
            method: 'app.inputHistory.get',
            params: {
                workspace: '/tmp/shared-workspace'
            }
        }, { principalId: 'local-system' });

        const userScoped = await rpc.handle({
            jsonrpc: '2.0',
            id: 26,
            method: 'app.inputHistory.get',
            params: {
                workspace: '/tmp/shared-workspace'
            }
        }, { principalId: 'user-1' });

        expect((localSystem as any).result).toEqual(['current prompt', 'legacy prompt']);
        expect((userScoped as any).result).toEqual([]);
    }

    @Test('lists audit records through json-rpc and applies filters')
    async listsAuditRecordsThroughJsonRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{} as any,audit);

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
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,tools,owners,new SessionHandler(runtime, store, owners),events);

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
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const streamedPrincipals: string[] = [];
        const streamedProfiles: Array<string | undefined> = [];
        const runtime = {
            async *runStreamingTurn(sessionId: string, input: string, principalId?: string, _message?: any, profile?: string) {
                streamedPrincipals.push(principalId || '');
                streamedProfiles.push(profile);
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const frames: any[] = [];
        for await (const frame of rpc.streamPayload({
            jsonrpc: '2.0',
            id: 11,
            method: 'run.turn_stream',
            params: { sessionId: 'rpc-stream', input: 'hello', profile: 'strong' }
        }, { principalId: 'user-1' })) {
            frames.push(frame);
        }

        expect(streamedProfiles).toEqual(['strong']);

        expect(frames).toMatchObject([{
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
                content: 'hel'
            }
        }, {
            jsonrpc: '2.0',
            method: 'run.turn_stream.chunk',
            params: {
                requestId: 11,
                sessionId: 'rpc-stream',
                chunkType: 'text',
                content: 'lo'
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

    @Test('lists and aggregates summary quality through json-rpc')
    async listsAndAggregatesSummaryQuality() {
        const quality = {
            async list(options?: { provider?: string; limit?: number }) {
                const provider = options?.provider;
                const limit = options?.limit ?? 200;
                return [
                    { id: 'sq1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, evidenceCoverage: 100, createdAt: 1 },
                    { id: 'sq2', provider: 'anthropic', total: 70, fieldCompleteness: 80, annotationQuality: 50, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, evidenceCoverage: 50, createdAt: 2 }
                ].filter(record => !provider || record.provider === provider).slice(0, limit);
            },
            async aggregate(provider?: string) {
                return provider
                    ? [{ provider, recordCount: 2, avgTotal: 81, minTotal: 70, maxTotal: 92, avgFieldCompleteness: 90, avgAnnotationQuality: 75, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 50, avgEvidenceCoverage: 75, timeRange: { from: 1, to: 2 } }]
                    : [
                        { provider: 'deepseek', recordCount: 1, avgTotal: 92, minTotal: 92, maxTotal: 92, avgFieldCompleteness: 100, avgAnnotationQuality: 100, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 0, avgEvidenceCoverage: 100, timeRange: { from: 1, to: 1 } },
                        { provider: 'anthropic', recordCount: 1, avgTotal: 70, minTotal: 70, maxTotal: 70, avgFieldCompleteness: 80, avgAnnotationQuality: 50, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 100, avgEvidenceCoverage: 50, timeRange: { from: 2, to: 2 } }
                    ];
            }
        } as any;
        const rpc = new AppRpcServer({} as any, new RandomUuidGenerator(),{} as any,{} as any,{ getToolDefinitions: () => [] } as any,{} as any,{} as any,{} as any,{} as any,null,null,quality);

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'summary_quality.list',
            params: { provider: 'deepseek', limit: 1 }
        }, { principalId: 'user-1' });
        expect((listResponse as any).result.records.length).toEqual(1);
        expect((listResponse as any).result.records[0].provider).toEqual('deepseek');
        expect((listResponse as any).result.records[0].model).toEqual('deepseek-v4-flash');
        expect((listResponse as any).result.records[0].fallbackUsed).toEqual(false);
        expect((listResponse as any).result.records[0].evidenceCoverage).toEqual(100);

        const statsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'summary_quality.stats',
            params: { provider: 'anthropic' }
        }, { principalId: 'user-1' });
        expect((statsResponse as any).result.aggregates.length).toEqual(1);
        expect((statsResponse as any).result.aggregates[0].provider).toEqual('anthropic');
        expect((statsResponse as any).result.aggregates[0].fallbackRate).toEqual(50);
        expect((statsResponse as any).result.aggregates[0].avgEvidenceCoverage).toEqual(75);

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('summary_quality.list');
        expect((capsResponse as any).result.methods).toContain('summary_quality.stats');
        expect((capsResponse as any).result.methods).toContain('summary_quality.trend');
    }

    @Test('builds a time-bucketed summary quality trend through json-rpc')
    async buildsSummaryQualityTrend() {
        const day = 24 * 60 * 60 * 1000;
        const quality = {
            async list(options?: { provider?: string; limit?: number }) {
                const provider = options?.provider;
                const limit = options?.limit ?? 200;
                return [
                    { id: 't1', provider: 'deepseek', total: 90, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, evidenceCoverage: 100, createdAt: 1 },
                    { id: 't2', provider: 'deepseek', total: 60, fieldCompleteness: 80, annotationQuality: 60, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, evidenceCoverage: 50, createdAt: 2 },
                    { id: 't3', provider: 'deepseek', total: 80, fieldCompleteness: 90, annotationQuality: 90, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 220, evidenceCoverage: 80, createdAt: day + 1 },
                    { id: 't4', provider: 'anthropic', total: 70, fieldCompleteness: 80, annotationQuality: 70, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 200, evidenceCoverage: 20, createdAt: day + 2 }
                ].filter(record => !provider || record.provider === provider).slice(0, limit);
            }
        } as any;
        const rpc = new AppRpcServer({} as any, new RandomUuidGenerator(),{} as any,{} as any,{ getToolDefinitions: () => [] } as any,{} as any,{} as any,{} as any,{} as any,null,null,quality);

        const trendResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'summary_quality.trend',
            params: { provider: 'deepseek' }
        }, { principalId: 'user-1' });
        const deepseek = (trendResponse as any).result.trend;
        expect(deepseek.length).toEqual(2);
        expect(deepseek[0].bucketStart).toEqual(0);
        expect(deepseek[0].recordCount).toEqual(2);
        expect(deepseek[0].avgTotal).toEqual(75);
        expect(deepseek[0].fallbackRate).toEqual(50);
        expect(deepseek[0].avgEvidenceCoverage).toEqual(75);
        expect(deepseek[1].bucketStart).toEqual(day);
        expect(deepseek[1].recordCount).toEqual(1);
        expect(deepseek[1].avgTotal).toEqual(80);
        expect(deepseek[1].avgEvidenceCoverage).toEqual(80);

        const allTrend = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'summary_quality.trend',
            params: {}
        }, { principalId: 'user-1' });
        const providers = (allTrend as any).result.trend;
        expect(providers.filter((point: { provider: string }) => point.provider === 'deepseek').length).toEqual(2);
        expect(providers.filter((point: { provider: string }) => point.provider === 'anthropic').length).toEqual(1);
    }

    @Test('filters summary quality rpc by model')
    async filtersSummaryQualityByModel() {
        const quality = {
            async list(options?: { provider?: string; model?: string; limit?: number }) {
                const day = 24 * 60 * 60 * 1000;
                const limit = options?.limit ?? 200;
                return [
                    { id: 'fm1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, evidenceCoverage: 100, createdAt: 1 },
                    { id: 'fm2', provider: 'deepseek', model: 'deepseek-v4-flash', total: 60, fieldCompleteness: 80, annotationQuality: 60, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, evidenceCoverage: 50, createdAt: day + 1 },
                    { id: 'fm3', provider: 'deepseek', model: 'deepseek-v3', total: 80, fieldCompleteness: 90, annotationQuality: 90, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 220, evidenceCoverage: 80, createdAt: 3 }
                ].filter(record => (!options?.provider || record.provider === options.provider)
                    && (!options?.model || record.model === options.model)).slice(0, limit);
            },
            async aggregate(provider?: string, model?: string) {
                const records = [
                    { id: 'fm1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fallbackUsed: false, createdAt: 1 },
                    { id: 'fm2', provider: 'deepseek', model: 'deepseek-v4-flash', total: 60, fallbackUsed: true, createdAt: 2 },
                    { id: 'fm3', provider: 'deepseek', model: 'deepseek-v3', total: 80, fallbackUsed: false, createdAt: 3 }
                ].filter(record => (!provider || record.provider === provider) && (!model || record.model === model));
                return [{
                    provider: 'deepseek',
                    recordCount: records.length,
                    avgTotal: Math.round(records.reduce((sum, record) => sum + record.total, 0) / records.length),
                    minTotal: Math.min(...records.map(record => record.total)),
                    maxTotal: Math.max(...records.map(record => record.total)),
                    avgFieldCompleteness: 90,
                    avgAnnotationQuality: 80,
                    avgLengthBalance: 100,
                    avgTruncationScore: 100,
                    fallbackRate: Math.round(records.filter(record => record.fallbackUsed).length / records.length * 100),
                    avgEvidenceCoverage: 75,
                    timeRange: { from: 1, to: 3 }
                }];
            }
        } as any;
        const rpc = new AppRpcServer({} as any, new RandomUuidGenerator(),{} as any,{} as any,{ getToolDefinitions: () => [] } as any,{} as any,{} as any,{} as any,{} as any,null,null,quality);

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'summary_quality.list',
            params: { provider: 'deepseek', model: 'deepseek-v4-flash' }
        }, { principalId: 'user-1' });
        const records = (listResponse as any).result.records;
        expect(records.length).toEqual(2);
        expect(records.every((record: { model: string }) => record.model === 'deepseek-v4-flash')).toEqual(true);

        const statsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'summary_quality.stats',
            params: { provider: 'deepseek', model: 'deepseek-v3' }
        }, { principalId: 'user-1' });
        expect((statsResponse as any).result.aggregates[0].recordCount).toEqual(1);
        expect((statsResponse as any).result.aggregates[0].avgTotal).toEqual(80);
        expect((statsResponse as any).result.aggregates[0].avgEvidenceCoverage).toEqual(75);

        const trendResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'summary_quality.trend',
            params: { provider: 'deepseek', model: 'deepseek-v4-flash' }
        }, { principalId: 'user-1' });
        expect((trendResponse as any).result.trend.length).toEqual(2);
        expect((trendResponse as any).result.trend[0].avgTotal).toEqual(92);
        expect((trendResponse as any).result.trend[1].avgTotal).toEqual(60);
        expect((trendResponse as any).result.trend[0].avgEvidenceCoverage).toEqual(100);
    }

    @Test('summary quality rpc returns empty payloads when no store is configured')
    async summaryQualityWithoutStore() {
        const rpc = new AppRpcServer({} as any, new RandomUuidGenerator(),{} as any,{} as any,{ getToolDefinitions: () => [] } as any,{} as any,{} as any,{} as any);

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'summary_quality.list',
            params: {}
        }, { principalId: 'user-1' });
        expect((listResponse as any).result.records).toEqual([]);

        const statsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'summary_quality.stats',
            params: {}
        }, { principalId: 'user-1' });
        expect((statsResponse as any).result.aggregates).toEqual([]);

        const trendResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'summary_quality.trend',
            params: {}
        }, { principalId: 'user-1' });
        expect((trendResponse as any).result.trend).toEqual([]);
    }

    @Test('lists compaction history for owned session through json-rpc')
    async listsCompactionHistoryThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-compaction', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const compactionHistory = {
            async list(sessionId?: string, options?: { limit?: number; offset?: number }) {
                return [{
                    id: 'c1',
                    sessionId: 'rpc-compaction',
                    strategy: 'compacted',
                    compactionTriggered: true,
                    level: 'light',
                    summaryInserted: true,
                    beforeMessageCount: 20,
                    afterMessageCount: 10,
                    beforeTokens: 8000,
                    afterTokens: 4000,
                    compactedMessageCount: 10,
                    preservedAnchorCount: 2,
                    recentMessageCount: 4,
                    prunedMessageCount: 0,
                    toolMessagesCompacted: 0,
                    compressionRatio: 50,
                    cumulativeTokenSavings: 4000,
                    replayed: false,
                    createdAt: 1
                }, {
                    id: 'c2',
                    sessionId: 'rpc-compaction',
                    strategy: 'compacted',
                    compactionTriggered: true,
                    level: 'deep',
                    summaryInserted: true,
                    beforeMessageCount: 30,
                    afterMessageCount: 8,
                    beforeTokens: 12000,
                    afterTokens: 3000,
                    compactedMessageCount: 22,
                    preservedAnchorCount: 2,
                    recentMessageCount: 4,
                    prunedMessageCount: 0,
                    toolMessagesCompacted: 0,
                    compressionRatio: 75,
                    cumulativeTokenSavings: 9000,
                    replayed: false,
                    createdAt: 2
                }].filter(record => record.sessionId === sessionId);
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,compactionHistory);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.list',
            params: { sessionId: 'rpc-compaction', level: 'deep' }
        }, { principalId: 'user-1' });
        const records = (response as any).result.records;
        expect(records.length).toEqual(1);
        expect(records[0].id).toEqual('c2');
        expect(records[0].level).toEqual('deep');
        expect(records[0].compressionRatio).toEqual(75);
        expect(records[0].cumulativeTokenSavings).toEqual(9000);
    }

    @Test('rejects foreign compaction history access through json-rpc')
    async rejectsForeignCompactionHistoryThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-compaction-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const compactionHistory = {
            async list() {
                return [];
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,compactionHistory);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.list',
            params: { sessionId: 'rpc-compaction-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
    }

    @Test('returns empty compaction history when no store is configured')
    async compactionHistoryWithoutStore() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.list',
            params: { sessionId: 'rpc-empty' }
        }, { principalId: 'user-1' });
        expect((response as any).result.records).toEqual([]);
    }

    @Test('returns compaction history stats through json-rpc')
    async compactionHistoryStatsThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-stats', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const compactionHistory = {
            async list() {
                return [];
            },
            async aggregate(sessionId?: string) {
                return sessionId
                    ? [{ sessionId: 'rpc-stats', recordCount: 2, compactedCount: 1, prunedCount: 1, avgCompressionRatio: 30, totalTokensBefore: 9000, totalTokensAfter: 4900, totalTokensSaved: 4100, timeRange: { from: 1, to: 2 } }]
                    : [{ sessionId: 'rpc-stats', recordCount: 2, compactedCount: 1, prunedCount: 1, avgCompressionRatio: 30, totalTokensBefore: 9000, totalTokensAfter: 4900, totalTokensSaved: 4100, timeRange: { from: 1, to: 2 } }];
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,compactionHistory);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.stats',
            params: { sessionId: 'rpc-stats' }
        }, { principalId: 'user-1' });
        const aggregates = (response as any).result.aggregates;
        expect(aggregates.length).toEqual(1);
        expect(aggregates[0].sessionId).toEqual('rpc-stats');
        expect(aggregates[0].recordCount).toEqual(2);
        expect(aggregates[0].compactedCount).toEqual(1);
        expect(aggregates[0].prunedCount).toEqual(1);
        expect(aggregates[0].avgCompressionRatio).toEqual(30);
        expect(aggregates[0].totalTokensSaved).toEqual(4100);
        expect(aggregates[0].timeRange).toEqual({ from: 1, to: 2 });
    }

    @Test('rejects foreign compaction history stats access through json-rpc')
    async rejectsForeignCompactionHistoryStatsThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-stats-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const compactionHistory = {
            async list() {
                return [];
            },
            async aggregate() {
                return [];
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,compactionHistory);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.stats',
            params: { sessionId: 'rpc-stats-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
    }

    @Test('returns empty compaction history stats when no store is configured')
    async compactionHistoryStatsWithoutStore() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty-stats', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.stats',
            params: {}
        }, { principalId: 'user-1' });
        expect((response as any).result.aggregates).toEqual([]);
    }

    @Test('returns compaction history trend through json-rpc with bucket options')
    async compactionHistoryTrendThroughRpc() {
        const day = 24 * 60 * 60 * 1000;
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-trend', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const compactionHistory = {
            async list() {
                return [];
            },
            async aggregate() {
                return [];
            },
            async trend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }) {
                const bucketSize = options?.bucketSize ?? day;
                return [
                    { sessionId: 'rpc-trend', bucketStart: bucketSize, recordCount: 1, compactedCount: 1, prunedCount: 0, avgCompressionRatio: 50, totalTokensBefore: 8000, totalTokensAfter: 4000, totalTokensSaved: 4000 }
                ].filter(point => !sessionId || point.sessionId === sessionId);
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,compactionHistory);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.trend',
            params: { sessionId: 'rpc-trend', bucketSize: 2 * day, maxBuckets: 10 }
        }, { principalId: 'user-1' });
        const trend = (response as any).result.trend;
        expect(trend.length).toEqual(1);
        expect(trend[0].sessionId).toEqual('rpc-trend');
        expect(trend[0].bucketStart).toEqual(2 * day);
        expect(trend[0].recordCount).toEqual(1);
        expect(trend[0].avgCompressionRatio).toEqual(50);
        expect(trend[0].totalTokensSaved).toEqual(4000);

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('compaction_history.list');
        expect((capsResponse as any).result.methods).toContain('compaction_history.stats');
        expect((capsResponse as any).result.methods).toContain('compaction_history.trend');
    }

    @Test('rejects foreign compaction history trend access through json-rpc')
    async rejectsForeignCompactionHistoryTrendThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-trend-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const compactionHistory = {
            async list() {
                return [];
            },
            async aggregate() {
                return [];
            },
            async trend() {
                return [];
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,compactionHistory);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.trend',
            params: { sessionId: 'rpc-trend-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
    }

    @Test('returns empty compaction history trend when no store is configured')
    async compactionHistoryTrendWithoutStore() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty-trend', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.trend',
            params: {}
        }, { principalId: 'user-1' });
        expect((response as any).result.trend).toEqual([]);
    }

    @Test('returns turn diagnostics stats through json-rpc')
    async turnDiagnosticsStatsThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-diag', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list(sessionId?: string) {
                return sessionId === 'rpc-diag'
                    ? [{ id: 'd1', sessionId: 'rpc-diag', createdAt: 1, emptyResponseRetryCount: 1, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: true, compactionCount: 2, totalTokenSavings: 4000, compressionRatio: 50, compactionLevel: 'L3', promptCache: { provider: 'deepseek', supported: true, applied: true, appliedStrategy: 'partial', appliedScopes: ['history'], cachedTokens: 512 } }]
                    : [];
            },
            async aggregate(sessionIds?: string[]) {
                return {
                    sessionIds,
                    totalTurns: 2,
                    emptyResponseCount: 1,
                    emptyResponseRate: 50,
                    repeatedClarificationCount: 1,
                    repeatedQuestionRate: 50,
                    finalClarificationCount: 0,
                    clarificationRate: 0,
                    followUpRecoveryCount: 1,
                    followUpRecoveryRate: 50,
                    compactionCount: 2,
                    totalTokenSavings: 4000,
                    timeRange: { from: 1, to: 2 }
                };
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.stats',
            params: { sessionId: 'rpc-diag' }
        }, { principalId: 'user-1' });
        const aggregate = (response as any).result.aggregate;
        expect(aggregate.totalTurns).toEqual(2);
        expect(aggregate.emptyResponseRate).toEqual(50);
        expect(aggregate.repeatedQuestionRate).toEqual(50);
        expect(aggregate.compactionCount).toEqual(2);
        expect(aggregate.totalTokenSavings).toEqual(4000);
        expect(aggregate.timeRange).toEqual({ from: 1, to: 2 });

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('turn_diagnostics.list');
        expect((capsResponse as any).result.methods).toContain('turn_diagnostics.stats');
    }

    @Test('returns usage stats through json-rpc')
    async usageStatsThroughRpc() {
        const now = Date.now();
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-usage-1', 'user-1');
        await owners.create('rpc-usage-2', 'user-2');
        await store.append('rpc-usage-1', {
            id: 'rpc-usage-msg-1',
            role: 'assistant',
            content: 'done',
            createdAt: now - (10 * 60 * 60 * 1000),
            metadata: { usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } }
        } as any);
        await store.append('rpc-usage-1', {
            id: 'rpc-usage-msg-2',
            role: 'assistant',
            content: 'done',
            createdAt: now - (2 * 24 * 60 * 60 * 1000),
            metadata: { usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 } }
        } as any);
        await store.append('rpc-usage-2', {
            id: 'rpc-usage-msg-3',
            role: 'assistant',
            content: 'done',
            createdAt: now - (8 * 60 * 60 * 1000),
            metadata: { usage: { promptTokens: 40, completionTokens: 20, totalTokens: 60 } }
        } as any);
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list() {
                return [
                    { sessionId: 'rpc-usage-1', createdAt: now - (10 * 60 * 60 * 1000) },
                    { sessionId: 'rpc-usage-1', createdAt: now - (2 * 24 * 60 * 60 * 1000) },
                    { sessionId: 'rpc-usage-2', createdAt: now - (8 * 60 * 60 * 1000) }
                ];
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'usage.stats',
            params: {}
        }, { principalId: 'user-1' });
        const usage = (response as any).result.usage;
        expect(usage.daily.turns).toEqual(1);
        expect(usage.daily.totalTokens).toEqual(15);
        expect(usage.weekly.turns).toEqual(2);
        expect(usage.weekly.totalTokens).toEqual(45);
        expect(usage.cumulative.turns).toEqual(2);
        expect(usage.cumulative.totalTokens).toEqual(45);

        const ranged = await rpc.handle({
            jsonrpc: '2.0', id: 3, method: 'usage.stats',
            params: { range: 'cumulative', since: now - (24 * 60 * 60 * 1000) }
        }, { principalId: 'user-1' });
        expect((ranged as any).result.range).toEqual('cumulative');
        expect((ranged as any).result.selected.turns).toEqual(1);
        expect((ranged as any).result.selected.totalTokens).toEqual(15);

        const invalid = await rpc.handle({ jsonrpc: '2.0', id: 4, method: 'usage.stats', params: { range: 'month' } }, { principalId: 'user-1' });
        expect((invalid as any).error.code).toEqual(-32602);

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('usage.stats');
    }

    @Test('rejects foreign turn diagnostics access through json-rpc')
    async rejectsForeignTurnDiagnosticsThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-diag-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list() {
                return [];
            },
            async aggregate() {
                return {};
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const statsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.stats',
            params: { sessionId: 'rpc-diag-locked' }
        }, { principalId: 'user-2' });
        expect((statsResponse as any).error.code).toEqual(-32003);

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'turn_diagnostics.list',
            params: { sessionId: 'rpc-diag-locked' }
        }, { principalId: 'user-2' });
        expect((listResponse as any).error.code).toEqual(-32003);
    }

    @Test('returns harness audit scoped to owned sessions through json-rpc')
    async harnessAuditScopedToOwnedSessions() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-harness-1', 'user-1');
        await owners.create('rpc-harness-2', 'user-2');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const now = Date.now();
        const turnDiagnostics = {
            async list() {
                return [
                    { sessionId: 'rpc-harness-1', createdAt: now, evidence: { turnId: 't1', sessionId: 'rpc-harness-1', entries: [{ id: 'e1', turnId: 't1', sessionId: 'rpc-harness-1', toolName: 'terminal', status: 'error', error: 'connect ECONNREFUSED', exitCode: 1, createdAt: now }], successCount: 0, errorCount: 1, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now } },
                    { sessionId: 'rpc-harness-2', createdAt: now, evidence: { turnId: 't2', sessionId: 'rpc-harness-2', entries: [{ id: 'e2', turnId: 't2', sessionId: 'rpc-harness-2', toolName: 'terminal', status: 'error', error: 'connect ECONNREFUSED', exitCode: 1, createdAt: now }], successCount: 0, errorCount: 1, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now } }
                ];
            }
        } as any;
        const weaknessMiner = new WeaknessMiner(turnDiagnostics, null);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics,null,weaknessMiner);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'harness.audit',
            params: {}
        }, { principalId: 'user-1' });
        const report = (response as any).result.report;
        expect(report).toBeTruthy();
        expect(report.scopedSessionIds).toEqual(['rpc-harness-1']);
        expect(report.totalTurns).toEqual(1);
        expect(report.topFailingTools[0].toolName).toEqual('terminal');
        expect(report.errorClusters[0].signature).toEqual('ECONNREFUSED');

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('harness.audit');
    }

    @Test('rejects foreign harness audit access through json-rpc')
    async rejectsForeignHarnessAuditThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-harness-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list() {
                return [];
            }
        } as any;
        const weaknessMiner = new WeaknessMiner(turnDiagnostics, null);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics,null,weaknessMiner);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'harness.audit',
            params: { sessionId: 'rpc-harness-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
    }

    @Test('returns null harness audit when no miner is configured')
    async harnessAuditWithoutMiner() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-harness-empty', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'harness.audit',
            params: {}
        }, { principalId: 'user-1' });
        expect((response as any).result.report).toEqual(null);
    }

    @Test('lists builtin harness profiles through json-rpc')
    async listsHarnessProfilesThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'harness.profile.list',
            params: {}
        }, { principalId: 'user-1' });
        const profiles = (response as any).result.profiles as any[];
        expect(profiles.map(p => p.name).sort()).toEqual(['default', 'strict']);
        expect(profiles[0].version).toEqual(1);
        expect((response as any).result.current).toEqual(undefined);

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('harness.profile.list');
        expect((capsResponse as any).result.methods).toContain('harness.profile.diff');
    }

    @Test('resolves current harness profile from agent options through json-rpc')
    async currentHarnessProfileFromOptions() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{ harnessProfile: 'strict' } as any);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'harness.profile.current',
            params: {}
        }, { principalId: 'user-1' });
        const profile = (response as any).result.profile;
        expect(profile.name).toEqual('strict');
        expect(profile.maxRepairRounds).toEqual(1);
    }

    @Test('diffs harness profiles through json-rpc')
    async diffsHarnessProfilesThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'harness.profile.diff',
            params: { from: 'default', to: 'strict' }
        }, { principalId: 'user-1' });
        const diff = (response as any).result.diff as string[];
        expect(diff.length).toBeGreaterThan(0);
        expect(diff.join('\n')).toContain('maxRepairRounds');

        const badResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'harness.profile.diff',
            params: { from: 'nope', to: 'strict' }
        }, { principalId: 'user-1' });
        expect((badResponse as any).result.error).toContain('Unknown harness profile');
    }

    @Test('aggregates turn diagnostics across owned sessions through json-rpc')
    async turnDiagnosticsStatsScopesToOwnedSessions() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-diag-1', 'user-1');
        await owners.create('rpc-diag-2', 'user-2');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list() {
                return [
                    { id: 'd1', sessionId: 'rpc-diag-1', createdAt: 1, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0 },
                    { id: 'd2', sessionId: 'rpc-diag-2', createdAt: 2, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0 }
                ];
            },
            async aggregate(sessionIds?: string[]) {
                return { sessionIds, totalTurns: sessionIds?.length ?? 0 };
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.stats',
            params: {}
        }, { principalId: 'user-1' });
        expect((response as any).result.aggregate.sessionIds).toEqual(['rpc-diag-1']);
    }

    @Test('returns empty turn diagnostics when no store is configured')
    async turnDiagnosticsWithoutStore() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty-diag', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.list',
            params: { sessionId: 'rpc-empty-diag' }
        }, { principalId: 'user-1' });
        expect((listResponse as any).result.records).toEqual([]);

        const statsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'turn_diagnostics.stats',
            params: {}
        }, { principalId: 'user-1' });
        expect((statsResponse as any).result.aggregate).toEqual(null);
    }

    @Test('returns turn diagnostics records through json-rpc')
    async turnDiagnosticsListThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-diag-list', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list(sessionId?: string, options?: { limit?: number }) {
                const limit = options?.limit ?? 200;
                return [
                    { id: 'd1', sessionId: 'rpc-diag-list', createdAt: 1, emptyResponseRetryCount: 1, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: true, compactionCount: 2, totalTokenSavings: 4000, compressionRatio: 50, compactionLevel: 'L3', promptCache: { provider: 'deepseek', supported: true, applied: true, appliedStrategy: 'partial', appliedScopes: ['history'], cachedTokens: 512 } },
                    { id: 'd2', sessionId: 'rpc-diag-list', createdAt: 2, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: true, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0 }
                ].filter(record => !sessionId || record.sessionId === sessionId).slice(0, limit);
            },
            async aggregate() {
                return {};
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.list',
            params: { sessionId: 'rpc-diag-list', limit: 1 }
        }, { principalId: 'user-1' });
        const records = (response as any).result.records;
        expect(records.length).toEqual(1);
        expect(records[0].id).toEqual('d1');
        expect(records[0].sessionId).toEqual('rpc-diag-list');
        expect(records[0].emptyResponseRetryCount).toEqual(1);
        expect(records[0].repeatedClarificationDetected).toEqual(true);
        expect(records[0].compactionCount).toEqual(2);
        expect(records[0].totalTokenSavings).toEqual(4000);
        expect(records[0].compressionRatio).toEqual(50);
        expect(records[0].compactionLevel).toEqual('L3');
        expect(records[0].promptCache).toEqual({ provider: 'deepseek', supported: true, applied: true, appliedStrategy: 'partial', appliedScopes: ['history'], cachedTokens: 512 });
    }

    @Test('returns turn diagnostics trend through json-rpc')
    async turnDiagnosticsTrendThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-diag-trend', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list() {
                return [];
            },
            async aggregate() {
                return {};
            },
            async trend(sessionIds?: string[], options?: any) {
                return [{
                    sessionId: 'rpc-diag-trend',
                    bucketStart: 0,
                    recordCount: 2,
                    emptyResponseCount: 1,
                    repeatedClarificationCount: 1,
                    followUpRecoveryCount: 1,
                    compactionCount: 2,
                    totalTokenSavings: 4000,
                    avgCompressionRatio: 50
                }];
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.trend',
            params: { sessionId: 'rpc-diag-trend', maxBuckets: 7 }
        }, { principalId: 'user-1' });
        const trend = (response as any).result.trend;
        expect(trend.length).toEqual(1);
        expect(trend[0].sessionId).toEqual('rpc-diag-trend');
        expect(trend[0].bucketStart).toEqual(0);
        expect(trend[0].recordCount).toEqual(2);
        expect(trend[0].emptyResponseCount).toEqual(1);
        expect(trend[0].repeatedClarificationCount).toEqual(1);
        expect(trend[0].compactionCount).toEqual(2);
        expect(trend[0].totalTokenSavings).toEqual(4000);
        expect(trend[0].avgCompressionRatio).toEqual(50);

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('turn_diagnostics.trend');
    }

    @Test('rejects foreign turn diagnostics trend through json-rpc')
    async rejectsForeignTurnDiagnosticsTrendThroughRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-diag-trend-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list() {
                return [];
            },
            async aggregate() {
                return {};
            },
            async trend() {
                return [];
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.trend',
            params: { sessionId: 'rpc-diag-trend-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
    }

    @Test('scopes turn diagnostics trend to owned sessions through json-rpc')
    async turnDiagnosticsTrendScopesToOwnedSessions() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-diag-1', 'user-1');
        await owners.create('rpc-diag-2', 'user-2');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const turnDiagnostics = {
            async list() {
                return [
                    { id: 'd1', sessionId: 'rpc-diag-1', createdAt: 1, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0 },
                    { id: 'd2', sessionId: 'rpc-diag-2', createdAt: 2, emptyResponseRetryCount: 0, followUpRecoveryCount: 0, followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false, compactionCount: 0, totalTokenSavings: 0 }
                ];
            },
            async aggregate() {
                return {};
            },
            async trend(sessionIds?: string[]) {
                return (sessionIds ?? []).map(id => ({ sessionId: id, bucketStart: 0, recordCount: 1, emptyResponseCount: 0, repeatedClarificationCount: 0, followUpRecoveryCount: 0, compactionCount: 0, totalTokenSavings: 0, avgCompressionRatio: 0 }));
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{},null,null,null,null,turnDiagnostics);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.trend',
            params: {}
        }, { principalId: 'user-1' });
        const trend = (response as any).result.trend;
        expect(trend.length).toEqual(1);
        expect(trend[0].sessionId).toEqual('rpc-diag-1');
    }

    @Test('returns empty turn diagnostics trend when no store is configured')
    async turnDiagnosticsTrendWithoutStore() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty-diag-trend', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'turn_diagnostics.trend',
            params: {}
        }, { principalId: 'user-1' });
        expect((response as any).result.trend).toEqual([]);
    }
    @Test('plan mode rpc toggles runtime state through json-rpc')
    async planModeRpcTogglesRuntimeState() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const planModes = new Set<string>();
        const runtime = {
            setPlanMode(sessionId: string, enabled: boolean) {
                if (enabled) {
                    planModes.add(sessionId);
                } else {
                    planModes.delete(sessionId);
                }
            },
            isPlanMode(sessionId: string) {
                return planModes.has(sessionId);
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const createResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.create',
            params: { sessionId: 'pm-s1' }
        }, { principalId: 'user-1' });
        expect((createResponse as any).result.sessionId).toEqual('pm-s1');

        const setOn = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.plan_mode.set',
            params: { sessionId: 'pm-s1', enabled: true }
        }, { principalId: 'user-1' });
        expect((setOn as any).result).toEqual({ sessionId: 'pm-s1', enabled: true });

        const getOn = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'session.plan_mode.get',
            params: { sessionId: 'pm-s1' }
        }, { principalId: 'user-1' });
        expect((getOn as any).result).toEqual({ sessionId: 'pm-s1', enabled: true });

        const setOff = await rpc.handle({
            jsonrpc: '2.0',
            id: 4,
            method: 'session.plan_mode.set',
            params: { sessionId: 'pm-s1', enabled: false }
        }, { principalId: 'user-1' });
        expect((setOff as any).result).toEqual({ sessionId: 'pm-s1', enabled: false });

        const getOff = await rpc.handle({
            jsonrpc: '2.0',
            id: 5,
            method: 'session.plan_mode.get',
            params: { sessionId: 'pm-s1' }
        }, { principalId: 'user-1' });
        expect((getOff as any).result).toEqual({ sessionId: 'pm-s1', enabled: false });
    }

    @Test('plan mode rpc rejects foreign session access')
    async planModeRpcRejectsForeignSession() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('pm-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            setPlanMode() {},
            isPlanMode() {
                return false;
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.plan_mode.set',
            params: { sessionId: 'pm-locked', enabled: true }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
        expect((response as any).error.message).toEqual('Forbidden');
    }

    @Test('sandbox mode rpc toggles runtime state through json-rpc')
    async sandboxModeRpcTogglesRuntimeState() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const sandboxModes = new Map<string, string>();
        const runtime = {
            setPlanMode() {},
            isPlanMode() {
                return false;
            },
            setSessionSandboxMode(sessionId: string, mode?: string | null) {
                if (!mode) {
                    sandboxModes.delete(sessionId);
                } else {
                    sandboxModes.set(sessionId, mode);
                }
            },
            getSessionSandboxMode(sessionId: string) {
                return sandboxModes.get(sessionId);
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.create',
            params: { sessionId: 'sb-s1' }
        }, { principalId: 'user-1' });

        const setWorkspace = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.sandbox_mode.set',
            params: { sessionId: 'sb-s1', mode: 'workspace' }
        }, { principalId: 'user-1' });
        expect((setWorkspace as any).result).toEqual({ sessionId: 'sb-s1', mode: 'workspace' });

        const getWorkspace = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'session.sandbox_mode.get',
            params: { sessionId: 'sb-s1' }
        }, { principalId: 'user-1' });
        expect((getWorkspace as any).result).toEqual({ sessionId: 'sb-s1', mode: 'workspace' });

        const setDefault = await rpc.handle({
            jsonrpc: '2.0',
            id: 4,
            method: 'session.sandbox_mode.set',
            params: { sessionId: 'sb-s1', mode: 'default' }
        }, { principalId: 'user-1' });
        expect((setDefault as any).result).toEqual({ sessionId: 'sb-s1', mode: 'default' });

        const getDefault = await rpc.handle({
            jsonrpc: '2.0',
            id: 5,
            method: 'session.sandbox_mode.get',
            params: { sessionId: 'sb-s1' }
        }, { principalId: 'user-1' });
        expect((getDefault as any).result).toEqual({ sessionId: 'sb-s1', mode: 'default' });
    }

    @Test('sandbox mode rpc rejects foreign session access')
    async sandboxModeRpcRejectsForeignSession() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('sb-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            setPlanMode() {},
            isPlanMode() {
                return false;
            },
            setSessionSandboxMode() {},
            getSessionSandboxMode() {
                return undefined;
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.sandbox_mode.set',
            params: { sessionId: 'sb-locked', mode: 'workspace' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
        expect((response as any).error.message).toEqual('Forbidden');
    }

    @Test('delegation mode rpc toggles runtime state through json-rpc')
    async delegationModeRpcTogglesRuntimeState() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const delegationModes = new Map<string, string>();
        const runtime = {
            setPlanMode() {},
            isPlanMode() {
                return false;
            },
            setSessionDelegationMode(sessionId: string, mode?: string | null) {
                if (!mode) {
                    delegationModes.delete(sessionId);
                } else {
                    delegationModes.set(sessionId, mode);
                }
            },
            getSessionDelegationMode(sessionId: string) {
                return delegationModes.get(sessionId) ?? 'explicit';
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.create',
            params: { sessionId: 'dl-s1' }
        }, { principalId: 'user-1' });

        const setProactive = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.delegation_mode.set',
            params: { sessionId: 'dl-s1', mode: 'proactive' }
        }, { principalId: 'user-1' });
        expect((setProactive as any).result).toEqual({ sessionId: 'dl-s1', mode: 'proactive' });

        const getProactive = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'session.delegation_mode.get',
            params: { sessionId: 'dl-s1' }
        }, { principalId: 'user-1' });
        expect((getProactive as any).result).toEqual({ sessionId: 'dl-s1', mode: 'proactive' });

        const setDefault = await rpc.handle({
            jsonrpc: '2.0',
            id: 4,
            method: 'session.delegation_mode.set',
            params: { sessionId: 'dl-s1', mode: 'default' }
        }, { principalId: 'user-1' });
        expect((setDefault as any).result).toEqual({ sessionId: 'dl-s1', mode: 'explicit' });

        const getDefault = await rpc.handle({
            jsonrpc: '2.0',
            id: 5,
            method: 'session.delegation_mode.get',
            params: { sessionId: 'dl-s1' }
        }, { principalId: 'user-1' });
        expect((getDefault as any).result).toEqual({ sessionId: 'dl-s1', mode: 'explicit' });
    }

    @Test('delegation mode rpc rejects invalid modes and foreign sessions')
    async delegationModeRpcRejectsInvalidAndForeign() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('dl-s2', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            setPlanMode() {},
            isPlanMode() {
                return false;
            },
            setSessionDelegationMode() {},
            getSessionDelegationMode() {
                return 'explicit';
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const invalid = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.delegation_mode.set',
            params: { sessionId: 'dl-s2', mode: 'aggressive' }
        }, { principalId: 'user-1' });
        expect((invalid as any).error.code).toEqual(-32602);
        expect(String((invalid as any).error.message)).toContain('delegation_mode');

        const foreign = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.delegation_mode.get',
            params: { sessionId: 'dl-s2' }
        }, { principalId: 'user-2' });
        expect((foreign as any).error.code).toEqual(-32003);
        expect((foreign as any).error.message).toEqual('Forbidden');
    }

    async undoRedoFileRouteThroughJsonRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const calls: string[] = [];
        const runtime = {
            async undoFileChange(sessionId: string) {
                calls.push(`undo:${sessionId}`);
                return { filePath: '/ws/a.txt', restored: 'content' };
            },
            async redoFileChange(sessionId: string) {
                calls.push(`redo:${sessionId}`);
                return { filePath: '/ws/a.txt', restored: 'content' };
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.create',
            params: { sessionId: 'uf-s1' }
        }, { principalId: 'user-1' });

        const undoResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.undo_file',
            params: { sessionId: 'uf-s1' }
        }, { principalId: 'user-1' });
        expect((undoResponse as any).result).toEqual({ filePath: '/ws/a.txt', restored: 'content' });

        const redoResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'session.redo_file',
            params: { sessionId: 'uf-s1' }
        }, { principalId: 'user-1' });
        expect((redoResponse as any).result).toEqual({ filePath: '/ws/a.txt', restored: 'content' });

        expect(calls).toEqual(['undo:uf-s1', 'redo:uf-s1']);
    }

    @Test('git_snapshot create/list/diff/revert/unrevert route to runtime through json-rpc')
    async gitSnapshotRpcRoundTrip() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const calls: string[] = [];
        const snapshot = { id: 'snap-1', sessionId: 'git-s1', workspace: '/ws/app', commit: 'abc123', messageId: 'msg-1', createdAt: 1 };
        const runtime = {
            captureGitStepSnapshot(sessionId: string, workspace: string, messageId?: string) {
                calls.push(`capture:${sessionId}:${workspace}:${messageId}`);
                return { ...snapshot, messageId: messageId || 'msg-1' };
            },
            listGitStepSnapshots(sessionId: string) {
                calls.push(`list:${sessionId}`);
                return [snapshot];
            },
            diffGitStepSnapshot(sessionId: string, ref: string) {
                calls.push(`diff:${sessionId}:${ref}`);
                return { ref, files: [{ filePath: 'a.txt', status: 'modified', insertions: 1, deletions: 1 }] };
            },
            async revertGitStepSnapshot(sessionId: string, messageId: string) {
                calls.push(`revert:${sessionId}:${messageId}`);
                return { reverted: true, sessionId, messageId, commit: 'abc123', restoredFiles: 1 };
            },
            async unrevertGitStepSnapshot(sessionId: string) {
                calls.push(`unrevert:${sessionId}`);
                return { reverted: true, sessionId, restoredFiles: 1 };
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        await store.setWorkspace('git-s1', '/ws/app');
        await owners.create('git-s1', 'user-1');

        const createResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.git_snapshot.create',
            params: { sessionId: 'git-s1', messageId: 'msg-1' }
        }, { principalId: 'user-1' });
        expect((createResponse as any).result.captured).toEqual(true);
        expect((createResponse as any).result.snapshot.id).toEqual('snap-1');

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.git_snapshot.list',
            params: { sessionId: 'git-s1' }
        }, { principalId: 'user-1' });
        expect((listResponse as any).result.length).toEqual(1);

        const diffResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'session.git_snapshot.diff',
            params: { sessionId: 'git-s1', messageId: 'msg-1' }
        }, { principalId: 'user-1' });
        expect((diffResponse as any).result.files[0].filePath).toEqual('a.txt');

        const revertResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 4,
            method: 'session.git_snapshot.revert',
            params: { sessionId: 'git-s1', messageId: 'msg-1' }
        }, { principalId: 'user-1' });
        expect((revertResponse as any).result.reverted).toEqual(true);

        const unrevertResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 5,
            method: 'session.git_snapshot.unrevert',
            params: { sessionId: 'git-s1' }
        }, { principalId: 'user-1' });
        expect((unrevertResponse as any).result.reverted).toEqual(true);

        expect(calls).toEqual([
            'capture:git-s1:/ws/app:msg-1',
            'list:git-s1',
            'diff:git-s1:msg-1',
            'revert:git-s1:msg-1',
            'unrevert:git-s1'
        ]);
    }

    @Test('git_snapshot create reports uncaptured state and requires a workspace')
    async gitSnapshotCreateEdgeCases() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            captureGitStepSnapshot() {
                return null;
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        await store.setWorkspace('git-s2', '/ws/app');
        await owners.create('git-s2', 'user-1');

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.git_snapshot.create',
            params: { sessionId: 'git-s2' }
        }, { principalId: 'user-1' });
        expect((response as any).result.captured).toEqual(false);
        expect((response as any).result.reason).toBeTruthy();

        await owners.create('git-s3', 'user-1');
        const noWorkspaceResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.git_snapshot.create',
            params: { sessionId: 'git-s3' }
        }, { principalId: 'user-1' });
        expect((noWorkspaceResponse as any).error.code).toEqual(-32603);
        expect((noWorkspaceResponse as any).error.message).toContain('no workspace');
    }

    @Test('git_snapshot diff and revert validate required params')
    async gitSnapshotRpcValidation() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            captureGitStepSnapshot() {
                return null;
            },
            diffGitStepSnapshot() {
                return null;
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        await owners.create('git-s4', 'user-1');

        const diffResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.git_snapshot.diff',
            params: { sessionId: 'git-s4' }
        }, { principalId: 'user-1' });
        expect((diffResponse as any).error.code).toEqual(-32603);
        expect((diffResponse as any).error.message).toContain('ref');

        const revertResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'session.git_snapshot.revert',
            params: { sessionId: 'git-s4' }
        }, { principalId: 'user-1' });
        expect((revertResponse as any).error.code).toEqual(-32603);
        expect((revertResponse as any).error.message).toContain('messageId');
    }

    @Test('review diff/list/get/save route through json-rpc and persist findings')
    async reviewRpcRoundTrip() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const review = {
            readOnly: true,
            base: 'HEAD',
            commitSha: 'abc123',
            files: ['src/a.ts'],
            diff: 'diff --git a/src/a.ts b/src/a.ts\n+new line',
            stats: '1 file changed, 1 insertion(+)'
        };
        const tools = {
            getToolDefinitions: () => [],
            async invoke(name: string, input: any, sessionId: string, principalId: string, workdir: string) {
                expect(name).toEqual('review_diff');
                expect(input.base).toEqual('HEAD');
                expect(input.scope).toEqual('staged');
                expect(input.paths).toEqual(['src/a.ts']);
                expect(typeof input.workdir).toEqual('string');
                expect(input.workdir.length).toBeGreaterThan(0);
                expect(sessionId).toEqual('rev-s1');
                expect(principalId).toEqual('user-1');
                return review;
            }
        } as any;
        const sessions = new SessionHandler({} as any, store, owners);
        const sink = ((await createOrmSessionStore()).audit);
        const reviewFindings = new ReviewFindingsStore(sink);
        const rpc = new AppRpcServer(
            { async getMessages() { return []; } } as any,
            new RandomUuidGenerator(), store, memory, tools, owners, sessions, events,
            undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
            reviewFindings
        );
        await store.setWorkspace('rev-s1', '/ws/app');
        await owners.create('rev-s1', 'user-1');

        const diffResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'review.diff',
            params: { sessionId: 'rev-s1', base: 'HEAD', scope: 'staged', paths: ['src/a.ts'] }
        }, { principalId: 'user-1' });
        expect((diffResponse as any).result.sessionId).toEqual('rev-s1');
        expect((diffResponse as any).result.review.files).toEqual(['src/a.ts']);
        expect((diffResponse as any).result.review.commitSha).toEqual('abc123');

        const saveResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'review.save',
            params: {
                sessionId: 'rev-s1',
                run: {
                    id: 'review-1',
                    base: 'HEAD',
                    commitSha: 'abc123',
                    files: ['src/a.ts'],
                    findings: [{
                        id: 'f1',
                        category: 'risk',
                        severity: 'warning',
                        summary: 'unchecked input',
                        anchor: { file: 'src/a.ts', line: 3 },
                        suggestion: 'validate input'
                    }]
                }
            }
        }, { principalId: 'user-1' });
        expect((saveResponse as any).result.run.id).toEqual('review-1');

        const listResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'review.list',
            params: { sessionId: 'rev-s1' }
        }, { principalId: 'user-1' });
        expect((listResponse as any).result.runs.length).toEqual(1);
        expect((listResponse as any).result.runs[0].findings[0].summary).toEqual('unchecked input');

        const getResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 4,
            method: 'review.get',
            params: { sessionId: 'rev-s1', id: 'review-1' }
        }, { principalId: 'user-1' });
        expect((getResponse as any).result.run.id).toEqual('review-1');
        expect((getResponse as any).result.run.commitSha).toEqual('abc123');
    }

    @Test('review get rejects foreign sessions and unknown runs')
    async reviewRpcValidation() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const sessions = new SessionHandler({} as any, store, owners);
        const sink = ((await createOrmSessionStore()).audit);
        const reviewFindings = new ReviewFindingsStore(sink);
        const rpc = new AppRpcServer(
            { async getMessages() { return []; } } as any,
            new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any,
            owners, sessions, events,
            undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
            reviewFindings
        );
        await store.setWorkspace('rev-s2', '/ws/app');
        await owners.create('rev-s2', 'user-1');
        await owners.create('rev-s3', 'user-1');

        const foreign = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'review.list',
            params: { sessionId: 'rev-foreign' }
        }, { principalId: 'user-1' });
        expect((foreign as any).error).toBeTruthy();

        const unknown = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'review.get',
            params: { sessionId: 'rev-s2', id: 'missing' }
        }, { principalId: 'user-1' });
        expect((unknown as any).error.message).toContain('not found');

        const saveWithoutRun = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'review.save',
            params: { sessionId: 'rev-s2' }
        }, { principalId: 'user-1' });
        expect((saveWithoutRun as any).error.message).toContain('run is required');
    }

    @Test('git_snapshot rpc rejects foreign session access')
    async gitSnapshotRpcRejectsForeignSession() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const runtime = {
            captureGitStepSnapshot() {
                return null;
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        await store.setWorkspace('git-locked', '/ws/app');
        await owners.create('git-locked', 'user-1');

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.git_snapshot.create',
            params: { sessionId: 'git-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
        expect((response as any).error.message).toEqual('Forbidden');
    }

    @Test('git snapshots REST routes expose create/list/diff/revert/unrevert')
    async gitSnapshotRestRoutesRoundTrip() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const snapshot = { id: 'snap-1', sessionId: 'git-s1', workspace: '/ws/app', commit: 'abc123', messageId: 'msg-1', createdAt: 1 };
        const runtime = {
            captureGitStepSnapshot() {
                return snapshot;
            },
            listGitStepSnapshots() {
                return [snapshot];
            },
            diffGitStepSnapshot() {
                return { ref: 'msg-1', files: [{ filePath: 'a.txt', status: 'modified', insertions: 1, deletions: 1 }] };
            },
            async revertGitStepSnapshot() {
                return { reverted: true, sessionId: 'git-s1', messageId: 'msg-1' };
            },
            async unrevertGitStepSnapshot() {
                return { reverted: true, sessionId: 'git-s1' };
            },
            async getMessages() {
                return [];
            }
        } as any;
        const handler = new SessionHandler(runtime, store, owners);
        await store.setWorkspace('git-s1', '/ws/app');
        await owners.create('git-s1', 'user-1');

        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });

        const captureBody = (res: any) => {
            let body = '';
            res.end = (value?: string) => {
                body = value ?? '';
                return res;
            };
            return () => body;
        };

        const routes = handler.getRoutes();
        const createRoute = routes.find(route => route.path === '/api/sessions/:id/git-snapshots' && route.method === 'POST')!;
        const createRes = { writeHead: () => createRes } as any;
        const readCreate = captureBody(createRes);
        await createRoute.handler(req, createRes, { id: 'git-s1' }, { messageId: 'msg-1' });
        expect(JSON.parse(readCreate()).captured).toEqual(true);
        expect(JSON.parse(readCreate()).snapshot.id).toEqual('snap-1');

        const listRoute = routes.find(route => route.path === '/api/sessions/:id/git-snapshots' && route.method === 'GET')!;
        const listRes = { writeHead: () => listRes } as any;
        const readList = captureBody(listRes);
        await listRoute.handler(req, listRes, { id: 'git-s1' });
        expect(JSON.parse(readList()).length).toEqual(1);

        const diffRoute = routes.find(route => route.path === '/api/sessions/:id/git-snapshots/diff' && route.method === 'POST')!;
        const diffRes = { writeHead: () => diffRes } as any;
        const readDiff = captureBody(diffRes);
        await diffRoute.handler(req, diffRes, { id: 'git-s1' }, { messageId: 'msg-1' });
        expect(JSON.parse(readDiff()).files[0].filePath).toEqual('a.txt');

        const revertRoute = routes.find(route => route.path === '/api/sessions/:id/git-snapshots/revert' && route.method === 'POST')!;
        const revertRes = { writeHead: () => revertRes } as any;
        const readRevert = captureBody(revertRes);
        await revertRoute.handler(req, revertRes, { id: 'git-s1' }, { messageId: 'msg-1' });
        expect(JSON.parse(readRevert()).reverted).toEqual(true);

        const unrevertRoute = routes.find(route => route.path === '/api/sessions/:id/git-snapshots/unrevert' && route.method === 'POST')!;
        const unrevertRes = { writeHead: () => unrevertRes } as any;
        const readUnrevert = captureBody(unrevertRes);
        await unrevertRoute.handler(req, unrevertRes, { id: 'git-s1' });
        expect(JSON.parse(readUnrevert()).reverted).toEqual(true);
    }

    @Test('session export returns transcript through json-rpc')
    async sessionExportThroughJsonRpc() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const messages = [
            { id: 'u1', role: 'user', content: 'inspect', createdAt: 1 },
            { id: 'a1', role: 'assistant', content: 'tool', createdAt: 2, metadata: { toolCalls: [{ id: 'tc-1', name: 'read_file', input: { path: 'README.md' } }] } },
            { id: 't1', role: 'tool', content: '{"ok":true}', createdAt: 3, toolCallId: 'tc-1' }
        ];
        for (const message of messages) {
            await store.append('export-rpc', message as any);
        }
        await owners.create('export-rpc', 'user-1');
        const runtime = {
            async getMessages() {
                return messages;
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.export',
            params: { sessionId: 'export-rpc', format: 'jsonl' }
        }, { principalId: 'user-1' });
        expect((response as any).result.format).toEqual('jsonl');
        expect((response as any).result.contentType).toContain('application/x-ndjson');
        expect((response as any).result.session.messageCount).toEqual(3);
        expect((response as any).result.toolCalls.length).toEqual(1);
        expect((response as any).result.content).toContain('"type":"tool_call"');

        const capsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'app.capabilities',
            params: {}
        }, { principalId: 'user-1' });
        expect((capsResponse as any).result.methods).toContain('session.export');
    }

    @Test('session export rejects foreign session access')
    async sessionExportRejectsForeignSession() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        await store.append('export-locked', { id: '1', role: 'user', content: 'hello', createdAt: 1 });
        await owners.create('export-locked', 'user-1');
        const runtime = {
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.export',
            params: { sessionId: 'export-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
        expect((response as any).error.message).toEqual('Forbidden');
    }

    @Test('undo_file rejects foreign session access')
    async undoFileRejectsForeignSession() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('uf-locked', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            async undoFileChange() {
                return { filePath: '', restored: 'none' };
            },
            async getMessages() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'session.undo_file',
            params: { sessionId: 'uf-locked' }
        }, { principalId: 'user-2' });
        expect((response as any).error.code).toEqual(-32003);
        expect((response as any).error.message).toEqual('Forbidden');
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

    @Test('streams context prepared and turn diagnostics events through rpc stream')
    async streamsContextPreparedAndTurnDiagnosticsEvents() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('rpc-diag');
        await owners.create('rpc-diag', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {
            async *runStreamingTurn(sessionId: string, input: string) {
                await store.append(sessionId, { id: 'u1', role: 'user', content: input, createdAt: 1 } as any);
                yield { type: 'text', content: 'ok' };
                events.onContextPrepared(new AgentContextPreparedEvent(events, sessionId, {
                    strategy: 'pruned',
                    compactionTriggered: false,
                    level: 'light',
                    summaryInserted: false,
                    beforeMessageCount: 20,
                    afterMessageCount: 15,
                    beforeTokens: 8000,
                    afterTokens: 5000,
                    compactedMessageCount: 0,
                    preservedAnchorCount: 2,
                    recentMessageCount: 6,
                    prunedMessageCount: 5,
                    toolMessagesCompacted: 0,
                    compressionRatio: 38,
                    retentionRate: 75,
                    cumulativeTokenSavings: 3000,
                    replayed: false
                }));
                events.onTurnDiagnostics(new AgentTurnDiagnosticsEvent(events, sessionId, {
                    emptyResponseRetryCount: 0,
                    followUpRecoveryCount: 0,
                    followUpContextRewritten: false,
                    finalAssistantWasClarification: false,
                    repeatedClarificationDetected: false,
                    compactionCount: 1,
                    totalTokenSavings: 3000,
                    compressionRatio: 38,
                    compactionLevel: 'none',
                    promptCache: {
                        requested: { enabled: true, strategy: 'auto', scopes: ['system', 'summary', 'memory'] },
                        provider: 'anthropic',
                        supported: 'partial',
                        applied: true,
                        appliedStrategy: 'ephemeral',
                        appliedScopes: ['system'],
                        observedCachedPromptTokens: 512,
                        observedCreatedPromptTokens: 128
                    }
                }));
                yield { type: 'done' };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);

        const frames: any[] = [];
        for await (const frame of rpc.streamPayload({
            jsonrpc: '2.0',
            id: 21,
            method: 'run.turn_stream',
            params: { sessionId: 'rpc-diag', input: 'hello' }
        }, { principalId: 'user-1' })) {
            frames.push(frame);
        }

        const contextPrepared = frames.find(frame =>
            frame.params?.chunkType === 'event' && frame.params?.eventType === 'context_prepared');
        expect(contextPrepared?.params?.label).toEqual('model');
        expect(contextPrepared?.params?.status).toEqual('success');
        expect(contextPrepared?.params?.content).toContain('Context pruned: 8000→5000');
        expect(contextPrepared?.params?.report?.strategy).toEqual('pruned');
        expect(contextPrepared?.params?.report?.compressionRatio).toEqual(38);

        const turnDiagnostics = frames.find(frame =>
            frame.params?.chunkType === 'event' && frame.params?.eventType === 'turn_diagnostics');
        expect(turnDiagnostics?.params?.label).toEqual('state');
        expect(turnDiagnostics?.params?.content).toContain('1 compaction');
        expect(turnDiagnostics?.params?.content).toContain('prompt cache partial (applied, 512 cached tokens)');
        expect(turnDiagnostics?.params?.diagnostics?.compactionCount).toEqual(1);
        expect(turnDiagnostics?.params?.diagnostics?.totalTokenSavings).toEqual(3000);
        expect(turnDiagnostics?.params?.diagnostics?.promptCache?.supported).toEqual('partial');
        expect(turnDiagnostics?.params?.diagnostics?.promptCache?.applied).toEqual(true);
        expect(turnDiagnostics?.params?.diagnostics?.promptCache?.observedCachedPromptTokens).toEqual(512);
    }
}

@Suite('StdioAppRpcServer')
export class StdioAppRpcServerTest {
    @Test('streams json-rpc responses over jsonl stdio transport')
    async streamsJsonRpcResponsesOverJsonlTransport() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);
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
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
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
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events);
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
        expect(responses).toMatchObject([{
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

    @Test('approval.list returns pending requests scoped by session and principal')
    async approvalListScopesPendingRequests() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await store.get('s-2');
        await owners.create('s-1', 'user-1');
        await owners.create('s-2', 'user-2');
        const sessions = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        const events = new EventHandler(owners);
        const approvalManager = new ToolApprovalManager({ publishEvent: async () => {} } as any, new RandomUuidGenerator(),{ requires: () => true, reason: () => 'approval required' } as any,{ defaultTimeoutMs: 60000 });
        const rpc = new AppRpcServer({ searchSessions: async () => [] } as any, new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{} as any,null,approvalManager as any);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 20,
            method: 'approval.list',
            params: {}
        }, { principalId: 'user-1' });

        expect((response as any).result.requests).toEqual([]);
    }

    @Test('approval.approve and approval.reject resolve pending requests')
    async approvalDecideResolvesPendingRequests() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sessions = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        const events = new EventHandler(owners);
        const approvalManager = new ToolApprovalManager({ publishEvent: async () => {} } as any, new RandomUuidGenerator(),{ requires: () => true, reason: () => 'approval required' } as any,{ defaultTimeoutMs: 60000 });

        const rpc = new AppRpcServer({ searchSessions: async () => [] } as any, new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{} as any,null,approvalManager as any);

        const pendingCheck = approvalManager.checkApproval('write_file', { path: '/tmp/x' }, 's-1');
        await new Promise<void>(resolve => setTimeout(resolve, 10));
        const pending = approvalManager.getPending();
        expect(pending.length).toBe(1);
        const requestId = pending[0].id;

        const approveResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 21,
            method: 'approval.approve',
            params: { requestId }
        }, { principalId: 'user-1' });

        expect((approveResponse as any).result.applied).toEqual(true);
        expect((approveResponse as any).result.decision).toEqual('approved');
        expect(approvalManager.getPending().length).toBe(0);
        await pendingCheck;
    }

    @Test('approval events are forwarded through the SSE event handler')
    async approvalEventsForwardedThroughSse() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const events = new EventHandler(owners);

        events.onApprovalRequested(new AgentApprovalRequestedEvent(events, {
            id: 'req-1',
            toolName: 'write_file',
            sessionId: 's-1',
            reason: 'approval required',
            summary: 'approval required',
            hasInput: true,
            inputSummary: '{"path":"/tmp/x"}',
            timeoutMs: 30000
        }));
        events.onApprovalCompleted(new AgentApprovalCompletedEvent(events, {
            id: 'req-1',
            toolName: 'write_file',
            sessionId: 's-1'
        }, true));

        const history = events.getHistory('s-1');
        const types = history.events.map(record => record.type);
        expect(types).toContain('approval_requested');
        expect(types).toContain('approval_completed');
        const requested = history.events.find(record => record.type === 'approval_requested');
        expect(requested?.data?.request?.id).toEqual('req-1');
        expect(requested?.data?.request?.sessionId).toEqual('s-1');
        const completed = history.events.find(record => record.type === 'approval_completed');
        expect(completed?.data?.approved).toEqual(true);

        events.onApprovalFailed(new AgentApprovalFailedEvent(events, {
            id: 'req-1',
            toolName: 'write_file',
            sessionId: 's-1'
        }, new Error('cancelled')));
        const failed = events.getHistory('s-1').events.find(record => record.type === 'approval_failed');
        expect(failed?.data?.error).toEqual('cancelled');
    }

    @Test('compensation events are forwarded through the SSE event handler')
    async compensationEventsForwardedThroughSse() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const events = new EventHandler(owners);

        events.onCompensation(new AgentCompensationEvent(events, 's-1', 'cancelled', 2, ['tc-a', 'tc-b']));

        const history = events.getHistory('s-1');
        const record = history.events.find(item => item.type === 'compensation');
        expect(record?.data?.sessionId).toEqual('s-1');
        expect(record?.data?.reason).toEqual('cancelled');
        expect(record?.data?.compensated).toEqual(2);
        expect(record?.data?.toolCallIds).toEqual(['tc-a', 'tc-b']);
    }

    @Test('context prepared events are forwarded through the SSE event handler')
    async contextPreparedEventsForwardedThroughSse() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const events = new EventHandler(owners);

        events.onContextPrepared(new AgentContextPreparedEvent(events, 's-1', {
            strategy: 'compacted',
            compactionTriggered: true,
            level: 'deep',
            summaryInserted: true,
            beforeMessageCount: 30,
            afterMessageCount: 12,
            beforeTokens: 12000,
            afterTokens: 4000,
            compactedMessageCount: 18,
            preservedAnchorCount: 2,
            recentMessageCount: 6,
            prunedMessageCount: 0,
            toolMessagesCompacted: 8,
            compressionRatio: 67,
            retentionRate: 40,
            cumulativeTokenSavings: 9000,
            replayed: false
        }));

        const history = events.getHistory('s-1');
        const record = history.events.find(item => item.type === 'context_prepared');
        expect(record?.data?.sessionId).toEqual('s-1');
        expect(record?.data?.report?.strategy).toEqual('compacted');
        expect(record?.data?.report?.beforeTokens).toEqual(12000);
        expect(record?.data?.report?.afterTokens).toEqual(4000);
        expect(record?.data?.report?.compressionRatio).toEqual(67);
    }

    @Test('turn diagnostics events are forwarded through the SSE event handler')
    async turnDiagnosticsEventsForwardedThroughSse() {
        const { store } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const events = new EventHandler(owners);

        events.onTurnDiagnostics(new AgentTurnDiagnosticsEvent(events, 's-1', {
            emptyResponseRetryCount: 0,
            followUpRecoveryCount: 1,
            followUpContextRewritten: true,
            finalAssistantWasClarification: false,
            repeatedClarificationDetected: false,
            compactionCount: 2,
            totalTokenSavings: 8000,
            compressionRatio: 60,
            compactionLevel: 'standard'
        }));

        const history = events.getHistory('s-1');
        const record = history.events.find(item => item.type === 'turn_diagnostics');
        expect(record?.data?.sessionId).toEqual('s-1');
        expect(record?.data?.diagnostics?.compactionCount).toEqual(2);
        expect(record?.data?.diagnostics?.totalTokenSavings).toEqual(8000);
        expect(record?.data?.diagnostics?.compressionRatio).toEqual(60);
    }

    @Test('run.cancel is idempotent for unknown and inactive sessions')
    async runCancelIsIdempotent() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sessions = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        const events = new EventHandler(owners);
        const runtime = { searchSessions: async () => [], cancelTurn: async () => ({ cancelled: false, compensated: 0, toolCallIds: [] }) } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{} as any,null,null);

        // unknown session: benign no-op instead of an error
        const unknown = await rpc.handle({
            jsonrpc: '2.0',
            id: 30,
            method: 'run.cancel',
            params: { sessionId: 'missing' }
        }, { principalId: 'user-1' });
        expect((unknown as any).result.cancelled).toEqual(false);

        // known session without an active turn: benign no-op
        const idle = await rpc.handle({
            jsonrpc: '2.0',
            id: 31,
            method: 'run.cancel',
            params: { sessionId: 's-1' }
        }, { principalId: 'user-1' });
        expect((idle as any).result.cancelled).toEqual(false);

        // repeating the cancel after it already resolved reports false again
        const idleSecond = await rpc.handle({
            jsonrpc: '2.0',
            id: 32,
            method: 'run.cancel',
            params: { sessionId: 's-1' }
        }, { principalId: 'user-1' });
        expect((idleSecond as any).result.cancelled).toEqual(false);
        expect((idleSecond as any).result.compensated).toEqual(0);
        expect((idleSecond as any).result.toolCallIds).toEqual([]);
        expect((idleSecond as any).error).toBeUndefined();
    }

    @Test('session.compact forwards to runtime compactNow and enforces owner access')
    async sessionCompactForwardsToRuntime() {
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        await store.append('s-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await owners.create('s-1', 'user-1');
        const sessions = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        const events = new EventHandler(owners);
        let receivedReason: string | undefined;
        let compactedCalls = 0;
        const runtime = {
            searchSessions: async () => [],
            compactNow: async (sessionId: string, reason?: string) => {
                compactedCalls += 1;
                receivedReason = reason;
                return {
                    sessionId,
                    compacted: true,
                    reason,
                    strategy: 'compacted',
                    level: 'light',
                    beforeMessageCount: 8,
                    afterMessageCount: 4,
                    beforeTokens: 208,
                    afterTokens: 120,
                    compactedMessageCount: 6,
                    compressionRatio: 42,
                    cumulativeTokenSavings: 88,
                    summaryInserted: true,
                    summary: '[Context Summary — compressed 6 messages]'
                };
            }
        } as any;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{} as any,null,null);

        // owner can compact with a reason
        const ok = await rpc.handle({
            jsonrpc: '2.0',
            id: 40,
            method: 'session.compact',
            params: { sessionId: 's-1', reason: '  manual trim  ' }
        }, { principalId: 'user-1' });
        expect(compactedCalls).toEqual(1);
        expect(receivedReason).toEqual('manual trim');
        expect((ok as any).result.compacted).toEqual(true);
        expect((ok as any).result.strategy).toEqual('compacted');
        expect((ok as any).result.compressionRatio).toEqual(42);
        expect((ok as any).error).toBeUndefined();

        // non-owner is rejected before touching the runtime
        const foreign = await rpc.handle({
            jsonrpc: '2.0',
            id: 41,
            method: 'session.compact',
            params: { sessionId: 's-1' }
        }, { principalId: 'user-2' });
        expect(compactedCalls).toEqual(1);
        expect((foreign as any).error.code).toBe(-32003);

        // missing sessionId is a param error
        const missing = await rpc.handle({
            jsonrpc: '2.0',
            id: 42,
            method: 'session.compact',
            params: {}
        }, { principalId: 'user-1' });
        expect((missing as any).error.code).toBe(-32602);
    }
}

class RpcEchoTranscriptionAdapter extends StreamingTranscriptionAdapter {
    readonly format: 'pcm16k' | 'wav' = 'pcm16k';
    chunks: Uint8Array[] = [];
    cancelled = false;
    async feedAudio(chunk: Uint8Array): Promise<void> {
        this.chunks.push(chunk);
    }
    async endAudio(): Promise<StreamingTranscriptionResult> {
        return { text: Buffer.concat(this.chunks as Buffer[]).toString('utf8') };
    }
    async cancelAudio(): Promise<void> {
        this.cancelled = true;
    }
}

class RpcEchoTtsAdapter extends StreamingTtsAdapter {
    readonly format: 'pcm16k' | 'wav' | 'mp3' = 'pcm16k';
    synthesized: string[] = [];
    async *synthesizeStream(text: string, _options?: StreamingTtsOptions): AsyncIterable<Uint8Array> {
        this.synthesized.push(text);
        yield Buffer.from(`[tts:${text}]`);
    }
}

@Suite('AppRpcServer audio RPC')
export class AppRpcServerAudioTest {
    private async makeRpc(withAudio: boolean, audioOptions?: { maxResponseAudioBytes?: number }): Promise<{
        rpc: AppRpcServer;
        stt: RpcEchoTranscriptionAdapter;
        tts: RpcEchoTtsAdapter;
        turns: string[];
        store: SessionStore;
    }> {
        const turns: string[] = [];
        const runtime = {
            async runTurn(sessionId: string, input: string) {
                turns.push(`${sessionId}|${input}`);
                await store.append(sessionId, { id: 'u1', role: 'user', content: input, createdAt: 1 } as any);
                await store.append(sessionId, { id: 'a1', role: 'assistant', content: `echo:${input}`, createdAt: 2 } as any);
                return { sessionId, message: { role: 'assistant', content: `echo:${input}`, createdAt: 2, id: 'a1' } };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            }
        } as any;
        const { store } = await createOrmSessionStore();
        const { memory } = await createOrmSessionStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const sessions = new SessionHandler(runtime, store, owners);
        const stt = new RpcEchoTranscriptionAdapter();
        const tts = new RpcEchoTtsAdapter();
        const audio = withAudio ? new AudioSessionHandler(runtime, stt, tts, audioOptions) : null;
        const rpc = new AppRpcServer(runtime,new RandomUuidGenerator(),store,memory,{ getToolDefinitions: () => [] } as any,owners,sessions,events,{} as any,null,null,null,null,null,null,null,null,audio as any);
        return { rpc, stt, tts, turns, store };
    }

    private async handle(rpc: AppRpcServer, method: string, params: any, principalId = 'user-1'): Promise<any> {
        return rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
    }

    @Test('audio.status reports unavailable when no audio handler is configured')
    async statusWithoutAudioHandler() {
        const { rpc, store } = await this.makeRpc(false);
        await store.get('s-1');
        const response = await this.handle(rpc, 'audio.status', { sessionId: 's-1' });
        expect(response.result.available).toBe(false);
        expect(response.result.missing).toContain('streaming STT adapter');
        expect(response.result.active).toBe(false);
    }

    @Test('audio.start fails gracefully without an audio handler')
    async startWithoutAudioHandler() {
        const { rpc, store } = await this.makeRpc(false);
        await store.get('s-1');
        const response = await this.handle(rpc, 'audio.start', { sessionId: 's-1' });
        expect(response.result.ok).toBe(false);
        expect(response.result.error).toContain('audio unavailable');
    }

    @Test('audio.start, feed and end run the full RPC flow with base64 chunks')
    async fullRpcFlow() {
        const { rpc, stt, tts, turns, store } = await this.makeRpc(true);
        await store.get('s-1');

        const start = await this.handle(rpc, 'audio.start', { sessionId: 's-1' });
        expect(start.result.ok).toBe(true);
        expect(start.result.available).toBe(true);

        const statusActive = await this.handle(rpc, 'audio.status', { sessionId: 's-1' });
        expect(statusActive.result.active).toBe(true);
        expect(statusActive.result.bufferedBytes).toBe(0);

        const feed1 = await this.handle(rpc, 'audio.feed', { sessionId: 's-1', chunk: Buffer.from('hel').toString('base64') });
        expect(feed1.result.ok).toBe(true);
        expect(feed1.result.bufferedBytes).toBe(3);
        const feed2 = await this.handle(rpc, 'audio.feed', { sessionId: 's-1', chunk: Buffer.from('lo').toString('base64') });
        expect(feed2.result.bufferedBytes).toBe(5);

        const end = await this.handle(rpc, 'audio.end', { sessionId: 's-1' });
        expect(end.result.ok).toBe(true);
        expect(end.result.transcribed).toBe('hello');
        expect(end.result.reply).toBe('echo:hello');
        expect(turns).toEqual(['s-1|hello']);
        expect(stt.chunks.length).toBe(2);
        expect(tts.synthesized).toEqual(['echo:hello']);
        expect(end.result.audio.format).toBe('pcm16k');
        expect(end.result.audio.totalBytes).toBe(Buffer.byteLength('[tts:echo:hello]'));
        expect(Buffer.from(end.result.audio.chunks[0], 'base64').toString()).toBe('[tts:echo:hello]');
        expect(end.result.audio.truncated).toBe(false);

        const statusDone = await this.handle(rpc, 'audio.status', { sessionId: 's-1' });
        expect(statusDone.result.active).toBe(false);
        expect(statusDone.result.bufferedBytes).toBe(0);
    }

    @Test('audio.start negotiates the capture format and rejects incompatible input')
    async startNegotiatesAudioFormat() {
        const { rpc, store } = await this.makeRpc(true);
        await store.get('s-1');

        const accepted = await this.handle(rpc, 'audio.start', { sessionId: 's-1', format: 'pcm16k' });
        expect(accepted.result.ok).toBe(true);
        expect(accepted.result.format).toBe('pcm16k');
        await this.handle(rpc, 'audio.cancel', { sessionId: 's-1' });

        const incompatible = await this.handle(rpc, 'audio.start', { sessionId: 's-1', format: 'webm' });
        expect(incompatible.result.ok).toBe(false);
        expect(incompatible.result.format).toBe('pcm16k');
        expect(incompatible.result.error).toContain("unsupported audio format 'webm'");

        const invalid = await this.handle(rpc, 'audio.start', { sessionId: 's-1', format: 'mp3' });
        expect(invalid.error.code).toBe(-32602);
    }

    @Test('audio.end caps synthesized audio included in RPC responses')
    async endCapsSynthesizedAudio() {
        const { rpc, tts, store } = await this.makeRpc(true, { maxResponseAudioBytes: 4 });
        await store.get('s-1');
        await this.handle(rpc, 'audio.start', { sessionId: 's-1' });
        await this.handle(rpc, 'audio.feed', {
            sessionId: 's-1',
            chunk: Buffer.from('hello').toString('base64')
        });

        const end = await this.handle(rpc, 'audio.end', { sessionId: 's-1' });

        expect(tts.synthesized).toEqual(['echo:hello']);
        expect(end.result.audio.chunks).toEqual([]);
        expect(end.result.audio.totalBytes).toBe(0);
        expect(end.result.audio.truncated).toBe(true);
    }

    @Test('audio.feed and audio.end reject when no session was started')
    async feedAndEndWithoutStart() {
        const { rpc, store } = await this.makeRpc(true);
        await store.get('s-1');

        const feed = await this.handle(rpc, 'audio.feed', { sessionId: 's-1', chunk: Buffer.from('x').toString('base64') });
        expect(feed.result.ok).toBe(false);
        expect(feed.result.error).toContain('audio.start first');

        const end = await this.handle(rpc, 'audio.end', { sessionId: 's-1' });
        expect(end.result.ok).toBe(false);
        expect(end.result.error).toContain('audio.start first');
    }

    @Test('audio.feed validates the base64 chunk parameter')
    async feedValidatesChunk() {
        const { rpc, store } = await this.makeRpc(true);
        await store.get('s-1');
        await this.handle(rpc, 'audio.start', { sessionId: 's-1' });

        const missing = await this.handle(rpc, 'audio.feed', { sessionId: 's-1' });
        expect(missing.error.code).toBe(-32602);

        const empty = await this.handle(rpc, 'audio.feed', { sessionId: 's-1', chunk: '' });
        expect(empty.error.code).toBe(-32602);
    }

    @Test('audio.cancel clears the session and is idempotent')
    async cancelFlow() {
        const { rpc, stt, store } = await this.makeRpc(true);
        await store.get('s-1');
        await this.handle(rpc, 'audio.start', { sessionId: 's-1' });
        await this.handle(rpc, 'audio.feed', { sessionId: 's-1', chunk: Buffer.from('partial').toString('base64') });

        const cancel = await this.handle(rpc, 'audio.cancel', { sessionId: 's-1' });
        expect(cancel.result.ok).toBe(true);
        expect(cancel.result.cancelled).toBe(true);
        expect(stt.cancelled).toBe(true);

        const status = await this.handle(rpc, 'audio.status', { sessionId: 's-1' });
        expect(status.result.active).toBe(false);
        expect(status.result.bufferedBytes).toBe(0);

        const cancelAgain = await this.handle(rpc, 'audio.cancel', { sessionId: 's-1' });
        expect(cancelAgain.result.ok).toBe(true);
        expect(cancelAgain.result.cancelled).toBe(false);
    }

    @Test('audio RPC rejects foreign session access')
    async foreignSessionRejected() {
        const { rpc, store } = await this.makeRpc(true);
        await store.get('s-1');
        await store.setOwner('s-1', 'user-2');

        const status = await this.handle(rpc, 'audio.status', { sessionId: 's-1' }, 'user-1');
        expect(status.error.code).toBe(-32003);

        const start = await this.handle(rpc, 'audio.start', { sessionId: 's-1' }, 'user-1');
        expect(start.error.code).toBe(-32003);
    }

    @Test('audio methods require a sessionId')
    async missingSessionId() {
        const { rpc } = await this.makeRpc(true);

        const start = await this.handle(rpc, 'audio.start', {});
        expect(start.error.code).toBe(-32602);

        const end = await this.handle(rpc, 'audio.end', {});
        expect(end.error.code).toBe(-32602);
    }
}

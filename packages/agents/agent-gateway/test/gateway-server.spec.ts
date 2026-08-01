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
import { CompactionHistoryHandler } from '../src/api/CompactionHistoryHandler';
import { TurnDiagnosticsHandler } from '../src/api/TurnDiagnosticsHandler';
import { SummaryQualityHandler } from '../src/api/SummaryQualityHandler';
import { InMemorySessionStore, InMemoryMemoryStore, AgentTurnStartedEvent, AgentStreamChunkEvent, AgentToolInvokedEvent, AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolSkippedEvent, AgentTurnCompletedEvent, AgentErrorEvent, AgentApprovalRequestedEvent, AgentApprovalCompletedEvent, AgentApprovalFailedEvent, AgentCompensationEvent, AgentContextPreparedEvent, AgentTurnDiagnosticsEvent, LocalToolRegistry, ToolApprovalManager } from '@tsdi/agent';
import { MemoryHandler } from '../src/api/MemoryHandler';
import { ToolsHandler } from '../src/api/ToolsHandler';
import { ApprovalHandler } from '../src/api/ApprovalHandler';
import { StatsHandler } from '../src/api/StatsHandler';
import { InMemoryAuditSink } from '../../agent/src/harness/InMemoryAuditSink';
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

    @Test('session delete route removes session-scoped memory records')
    async sessionDeleteRouteRemovesSessionMemory() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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

    @Test('lists owned sessions with thread project keys before workspace fallback')
    async listsOwnedSessionsPreferThreadProjectKeyOverWorkspace() {
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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

    @Test('cancelled turns are removed from the running sessions list')
    async cancelledTurnsAreRemovedFromRunningSessions() {
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const approvalManager = new ToolApprovalManager(
            { publishEvent: async () => {} } as any,
            { requires: () => true, reason: () => 'approval required' } as any,
            { defaultTimeoutMs: 60000 }
        );
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
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const approvalManager = new ToolApprovalManager(
            { publishEvent: async () => {} } as any,
            { requires: () => true, reason: () => 'approval required' } as any,
            { defaultTimeoutMs: 60000 }
        );
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
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await store.get('s-2');
        await owners.create('s-1', 'user-1');
        await owners.create('s-2', 'user-2');
        const approvalManager = new ToolApprovalManager(
            { publishEvent: async () => {} } as any,
            { requires: () => true, reason: () => 'approval required' } as any,
            { defaultTimeoutMs: 60000 }
        );
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
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await store.get('s-2');
        await owners.create('s-1', 'user-1');
        await owners.create('s-2', 'user-2');
        const sink = new InMemoryAuditSink();
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
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sink = new InMemoryAuditSink();
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
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sink = new InMemoryAuditSink();
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
        const store = new InMemorySessionStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sink = new InMemoryAuditSink();
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

@Suite('CompactionHistoryHandler')
export class CompactionHistoryHandlerTest {
    @Test('lists compaction history records for owned session and supports level filtering')
    async listsCompactionHistoryForOwnedSession() {
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
                    { id: 'q1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, createdAt: 1 },
                    { id: 'q2', provider: 'anthropic', total: 70, fieldCompleteness: 80, annotationQuality: 50, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, createdAt: 2 }
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
    }

    @Test('lists all summary quality records when no filter is provided')
    async listsAllSummaryQualityRecords() {
        const quality = {
            async list() {
                return [
                    { id: 'q1', provider: 'deepseek', model: null, total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, createdAt: 1 }
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
                    { id: 'q1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 75, fieldCompleteness: 90, annotationQuality: 70, lengthBalance: 80, truncationScore: 100, fallbackUsed: true, summaryLength: 230, createdAt: 1 },
                    { id: 'q2', provider: 'deepseek', model: 'deepseek-v4-flash', total: 90, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 240, createdAt: day + 1 },
                    { id: 'q3', provider: 'anthropic', model: null, total: 50, fieldCompleteness: 60, annotationQuality: 40, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 190, createdAt: day + 2 }
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
        expect(data.trend[1].bucketStart).toEqual(24 * 60 * 60 * 1000);
        expect(data.trend[1].avgTotal).toEqual(90);
        expect(data.trend[1].fallbackRate).toEqual(0);
        expect(data.trend[0].avgAnnotationQuality).toEqual(70);
        expect(typeof data.trend[0].minTotal).toEqual('number');
        expect(typeof data.trend[0].maxTotal).toEqual('number');
    }

    @Test('builds summary quality trend across all providers when no filter provided')
    async buildsSummaryQualityTrendOverHttpAllProviders() {
        const quality = {
            async list(options?: { provider?: string; limit?: number }) {
                return [
                    { id: 'q1', provider: 'deepseek', model: null, total: 80, fieldCompleteness: 90, annotationQuality: 80, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 220, createdAt: 1 },
                    { id: 'q2', provider: 'anthropic', model: null, total: 60, fieldCompleteness: 70, annotationQuality: 60, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 200, createdAt: 1 }
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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

    @Test('aggregates turn diagnostics scoped to an owned session')
    async aggregatesScopedStats() {
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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

    @Test('lists and aggregates summary quality through json-rpc')
    async listsAndAggregatesSummaryQuality() {
        const quality = {
            async list(options?: { provider?: string; limit?: number }) {
                const provider = options?.provider;
                const limit = options?.limit ?? 200;
                return [
                    { id: 'sq1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, createdAt: 1 },
                    { id: 'sq2', provider: 'anthropic', total: 70, fieldCompleteness: 80, annotationQuality: 50, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, createdAt: 2 }
                ].filter(record => !provider || record.provider === provider).slice(0, limit);
            },
            async aggregate(provider?: string) {
                return provider
                    ? [{ provider, recordCount: 2, avgTotal: 81, minTotal: 70, maxTotal: 92, avgFieldCompleteness: 90, avgAnnotationQuality: 75, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 50, timeRange: { from: 1, to: 2 } }]
                    : [
                        { provider: 'deepseek', recordCount: 1, avgTotal: 92, minTotal: 92, maxTotal: 92, avgFieldCompleteness: 100, avgAnnotationQuality: 100, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 0, timeRange: { from: 1, to: 1 } },
                        { provider: 'anthropic', recordCount: 1, avgTotal: 70, minTotal: 70, maxTotal: 70, avgFieldCompleteness: 80, avgAnnotationQuality: 50, avgLengthBalance: 100, avgTruncationScore: 100, fallbackRate: 100, timeRange: { from: 2, to: 2 } }
                    ];
            }
        } as any;
        const rpc = new AppRpcServer({} as any, {} as any, {} as any, { getToolDefinitions: () => [] } as any, {} as any, {} as any, {} as any, {} as any, null, null, quality);

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

        const statsResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 2,
            method: 'summary_quality.stats',
            params: { provider: 'anthropic' }
        }, { principalId: 'user-1' });
        expect((statsResponse as any).result.aggregates.length).toEqual(1);
        expect((statsResponse as any).result.aggregates[0].provider).toEqual('anthropic');
        expect((statsResponse as any).result.aggregates[0].fallbackRate).toEqual(50);

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
                    { id: 't1', provider: 'deepseek', total: 90, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, createdAt: 1 },
                    { id: 't2', provider: 'deepseek', total: 60, fieldCompleteness: 80, annotationQuality: 60, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, createdAt: 2 },
                    { id: 't3', provider: 'deepseek', total: 80, fieldCompleteness: 90, annotationQuality: 90, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 220, createdAt: day + 1 },
                    { id: 't4', provider: 'anthropic', total: 70, fieldCompleteness: 80, annotationQuality: 70, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 200, createdAt: day + 2 }
                ].filter(record => !provider || record.provider === provider).slice(0, limit);
            }
        } as any;
        const rpc = new AppRpcServer({} as any, {} as any, {} as any, { getToolDefinitions: () => [] } as any, {} as any, {} as any, {} as any, {} as any, null, null, quality);

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
        expect(deepseek[1].bucketStart).toEqual(day);
        expect(deepseek[1].recordCount).toEqual(1);
        expect(deepseek[1].avgTotal).toEqual(80);

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
                    { id: 'fm1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, fieldCompleteness: 100, annotationQuality: 100, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 230, createdAt: 1 },
                    { id: 'fm2', provider: 'deepseek', model: 'deepseek-v4-flash', total: 60, fieldCompleteness: 80, annotationQuality: 60, lengthBalance: 100, truncationScore: 100, fallbackUsed: true, summaryLength: 210, createdAt: day + 1 },
                    { id: 'fm3', provider: 'deepseek', model: 'deepseek-v3', total: 80, fieldCompleteness: 90, annotationQuality: 90, lengthBalance: 100, truncationScore: 100, fallbackUsed: false, summaryLength: 220, createdAt: 3 }
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
                    timeRange: { from: 1, to: 3 }
                }];
            }
        } as any;
        const rpc = new AppRpcServer({} as any, {} as any, {} as any, { getToolDefinitions: () => [] } as any, {} as any, {} as any, {} as any, {} as any, null, null, quality);

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

        const trendResponse = await rpc.handle({
            jsonrpc: '2.0',
            id: 3,
            method: 'summary_quality.trend',
            params: { provider: 'deepseek', model: 'deepseek-v4-flash' }
        }, { principalId: 'user-1' });
        expect((trendResponse as any).result.trend.length).toEqual(2);
        expect((trendResponse as any).result.trend[0].avgTotal).toEqual(92);
        expect((trendResponse as any).result.trend[1].avgTotal).toEqual(60);
    }

    @Test('summary quality rpc returns empty payloads when no store is configured')
    async summaryQualityWithoutStore() {
        const rpc = new AppRpcServer({} as any, {} as any, {} as any, { getToolDefinitions: () => [] } as any, {} as any, {} as any, {} as any);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
                    createdAt: 2
                }].filter(record => record.sessionId === sessionId);
            }
        } as any;
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {}, null, null, null, compactionHistory);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {}, null, null, null, compactionHistory);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {}, null, null, null, compactionHistory);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {}, null, null, null, compactionHistory);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty-stats', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {}, null, null, null, compactionHistory);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events, {}, null, null, null, compactionHistory);

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await owners.create('rpc-empty-trend', 'user-1');
        const events = new EventHandler(owners);
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);

        const response = await rpc.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'compaction_history.trend',
            params: {}
        }, { principalId: 'user-1' });
        expect((response as any).result.trend).toEqual([]);
    }
}
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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
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
                    cumulativeTokenSavings: 3000
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
        const rpc = new AppRpcServer(runtime, store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);

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

    @Test('approval.list returns pending requests scoped by session and principal')
    async approvalListScopesPendingRequests() {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await store.get('s-2');
        await owners.create('s-1', 'user-1');
        await owners.create('s-2', 'user-2');
        const sessions = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        const events = new EventHandler(owners);
        const approvalManager = new ToolApprovalManager(
            { publishEvent: async () => {} } as any,
            { requires: () => true, reason: () => 'approval required' } as any,
            { defaultTimeoutMs: 60000 }
        );
        const rpc = new AppRpcServer(
            { searchSessions: async () => [] } as any,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {} as any,
            null,
            approvalManager as any
        );

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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sessions = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        const events = new EventHandler(owners);
        const approvalManager = new ToolApprovalManager(
            { publishEvent: async () => {} } as any,
            { requires: () => true, reason: () => 'approval required' } as any,
            { defaultTimeoutMs: 60000 }
        );

        const rpc = new AppRpcServer(
            { searchSessions: async () => [] } as any,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {} as any,
            null,
            approvalManager as any
        );

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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
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
            cumulativeTokenSavings: 9000
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
        const store = new InMemorySessionStore();
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
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        await store.get('s-1');
        await owners.create('s-1', 'user-1');
        const sessions = new SessionHandler({ getMessages: async () => [] } as any, store, owners);
        const events = new EventHandler(owners);
        const runtime = { searchSessions: async () => [], cancelTurn: async () => ({ cancelled: false, compensated: 0, toolCallIds: [] }) } as any;
        const rpc = new AppRpcServer(
            runtime,
            store,
            memory,
            { getToolDefinitions: () => [] } as any,
            owners,
            sessions,
            events,
            {} as any,
            null,
            null
        );

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
}

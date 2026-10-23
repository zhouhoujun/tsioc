import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, RandomUuidGenerator } from '@tsdi/core';
import { HttpAuthService } from '@tsdi/security';
import { AGENT_OPTIONS, ApprovalDecision, ApprovalManager, defaultAgentOptions, DefaultApprovalStrategy, provideAgentOrm, ToolApprovalManager } from '@tsdi/agent';
import { ApprovalHandler } from '../src/api/ApprovalHandler';
import { AuthMiddleware, getRequestAuth } from '../src/auth/AuthMiddleware';
import { AgentGatewayModule } from '../src/agent-gateway.module';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { createAgentGatewayProviders } from '../src/provider';

function request(authorization?: string, url = '/api/approvals'): any {
    return { headers: authorization ? { authorization: `Bearer ${authorization}` } : {}, url } as any;
}

function response(): any {
    const res: any = { status: 0, body: '' };
    res.writeHead = (code: number) => {
        res.status = code;
        return res;
    };
    res.end = (body?: string) => {
        res.body = body || '';
        return res;
    };
    return res;
}

function buildManager() {
    const app = { publishEvent: async () => undefined } as any;
    return new ToolApprovalManager(
        app,
        new RandomUuidGenerator(),
        new DefaultApprovalStrategy(['shell.exec']),
        { defaultTimeoutMs: 400 }
    );
}

function routeOf(handler: ApprovalHandler, method: string, path: string) {
    const route = handler.getRoutes().find(item => item.method === method && item.path === path);
    return route!.handler as any;
}

@Suite('third-party approvers')
export class RemoteApprovalTest {

    @Test('an approver token authenticates with the approver role')
    async approverToken() {
        const middleware = new AuthMiddleware(new HttpAuthService(), {
            authToken: 'owner-secret',
            approvers: [{ id: 'ci', token: 'ci-secret' }]
        } as any);
        const req = request('ci-secret');
        expect(await middleware.authenticate(req, response())).toBe(true);
        expect(getRequestAuth(req)?.role).toBe('approver');
        expect(getRequestAuth(req)?.principalId).toBe('approver:ci');

        // A bad token is rejected when auth is configured.
        const bad = request('nope');
        const res = response();
        expect(await middleware.authenticate(bad, res)).toBe(false);
        expect(res.status).toBe(401);
    }

    @Test('approvers can be configured through TSDI_AGENT_APPROVER_TOKENS')
    async approverEnvFallback() {
        const previous = process.env.TSDI_AGENT_APPROVER_TOKENS;
        process.env.TSDI_AGENT_APPROVER_TOKENS = 'ops=env-secret, ci=ci-secret';
        try {
            const middleware = new AuthMiddleware(new HttpAuthService(), { authToken: 'owner-secret' } as any);
            expect(middleware.approvers().map(item => item.id)).toEqual(['ops', 'ci']);
            expect(middleware.matchApprover('env-secret')?.id).toEqual('ops');
            expect(middleware.matchApprover('ci-secret')?.id).toEqual('ci');
            expect(middleware.matchApprover('wrong')).toBeUndefined();
        } finally {
            if (previous === undefined) {
                delete process.env.TSDI_AGENT_APPROVER_TOKENS;
            } else {
                process.env.TSDI_AGENT_APPROVER_TOKENS = previous;
            }
        }
    }

    @Test('an approver lists every pending request regardless of ownership')
    async approverSeesAll() {
        const manager = buildManager();
        const first = manager.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        const second = manager.checkApproval('shell.exec', { cmd: 'pwd' }, 's2');
        try {
            const middleware = new AuthMiddleware(new HttpAuthService(), {
                authToken: 'owner-secret',
                approvers: [{ id: 'ci', token: 'ci-secret' }]
            } as any);
            const owners = { isAuthorized: async () => false, listOwned: async () => [] } as any;
            const handler = new ApprovalHandler(manager, owners);
            const req = request('ci-secret');
            await middleware.authenticate(req, response());
            const res = response();
            await routeOf(handler, 'GET', '/api/approvals')(req, res, {});
            expect(JSON.parse(res.body).requests.length).toEqual(2);

            // An owner without ownership of these sessions sees nothing.
            const ownerReq = request('owner-secret');
            await middleware.authenticate(ownerReq, response());
            const ownerRes = response();
            await routeOf(handler, 'GET', '/api/approvals')(ownerReq, ownerRes, {});
            expect(JSON.parse(ownerRes.body).requests.length).toEqual(0);
        } finally {
            manager.cancelBySession('s1');
            manager.cancelBySession('s2');
            await Promise.allSettled([first, second]);
        }
    }

    @Test('an approver can approve a request owned by another principal')
    async approverDecides() {
        const manager = buildManager();
        const pending = manager.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        try {
            const middleware = new AuthMiddleware(new HttpAuthService(), {
                authToken: 'owner-secret',
                approvers: [{ id: 'ci', token: 'ci-secret' }]
            } as any);
            const owners = { isAuthorized: async () => false, listOwned: async () => [] } as any;
            const handler = new ApprovalHandler(manager, owners);
            const req = request('ci-secret');
            await middleware.authenticate(req, response());
            const requestId = manager.getPending()[0].id;
            const res = response();
            await routeOf(handler, 'POST', '/api/approvals/:id/approve')(req, res, { id: requestId });
            expect(JSON.parse(res.body).applied).toBe(true);
            expect((await pending).decision).toEqual(ApprovalDecision.APPROVED);
        } finally {
            manager.cancelBySession('s1');
        }
    }

    @Test('a real gateway resolves the shared manager and serves approver REST calls')
    async gatewayEndToEnd() {
        const ctx = await Application.run({
            module: AgentGatewayModule,
            providers: [
                ...provideAgentOrm({
                    type: 'sqljs' as any,
                    autoLoadEntities: false as any,
                    synchronize: true,
                    autoSave: false,
                    entities: [] as any
                } as any),
                {
                    provide: AGENT_OPTIONS,
                    useValue: { ...defaultAgentOptions, tools: { ...defaultAgentOptions.tools, requireApproval: ['terminal'] } }
                },
                ...createAgentGatewayProviders({
                    port: 0,
                    host: '127.0.0.1',
                    authToken: 'owner-secret',
                    approvers: [{ id: 'ci', token: 'ci-secret' }]
                })
            ]
        });
        try {
            const address = ctx.get(GatewayServer).address()!;
            const base = `http://127.0.0.1:${address.port}`;
            const manager = ctx.get(ApprovalManager);
            const handler = ctx.get(ApprovalHandler) as any;
            // `T | null` unions emit `Object` as design metadata; without the
            // explicit tokens these were undefined and the queue looked empty.
            expect(handler.approvalManager).toBe(manager);
            expect(handler.owners).toBeTruthy();

            const pending = manager.checkApproval('terminal', { command: 'ls' }, 's1');
            const approver = { authorization: 'Bearer ci-secret' };
            const listed = await (await fetch(`${base}/api/approvals`, { headers: approver })).json() as any;
            expect(listed.requests?.length).toEqual(1);

            const approved = await (await fetch(`${base}/api/approvals/${listed.requests[0].id}/approve`, {
                method: 'POST',
                headers: approver
            })).json() as any;
            expect(approved.applied).toBe(true);
            expect((await pending).decision).toEqual(ApprovalDecision.APPROVED);

            const second = manager.checkApproval('terminal', { command: 'pwd' }, 's2');
            const pendingId = manager.getPending()[0].id;
            const forbidden = await fetch(`${base}/api/approvals/${pendingId}/reject`, {
                method: 'POST',
                headers: { authorization: 'Bearer owner-secret' }
            });
            expect(forbidden.status).toBe(403);
            manager.cancelBySession('s2');
            await Promise.allSettled([second]);
        } finally {
            await ctx.close();
        }
    }

    @Test('a non-owner without approver rights is forbidden')
    async ownerCannotDecideForeignSession() {
        const manager = buildManager();
        const pending = manager.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        try {
            const middleware = new AuthMiddleware(new HttpAuthService(), { authToken: 'owner-secret' } as any);
            const owners = { isAuthorized: async () => false, listOwned: async () => [] } as any;
            const handler = new ApprovalHandler(manager, owners);
            const req = request('owner-secret');
            await middleware.authenticate(req, response());
            const requestId = manager.getPending()[0].id;
            const res = response();
            await routeOf(handler, 'POST', '/api/approvals/:id/approve')(req, res, { id: requestId });
            expect(res.status).toBe(403);
            expect(manager.getPending().length).toEqual(1);
        } finally {
            manager.cancelBySession('s1');
            await Promise.allSettled([pending]);
        }
    }
}

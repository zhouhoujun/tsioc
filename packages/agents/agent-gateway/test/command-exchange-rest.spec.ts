import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentModule, ExchangeMetrics, provideAgentOrm, SessionStore, TypeOrmCommandExchangeStore } from '@tsdi/agent';
import { Application } from '@tsdi/core';
import { setRequestAuth } from '../src/auth/AuthMiddleware';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { CommandExchangeHandler } from '../src/api/CommandExchangeHandler';

function response() {
    const result: any = { status: 0, body: '', headers: {} };
    result.writeHead = (status: number, headers?: any) => { result.status = status; result.headers = headers || {}; return result; };
    result.end = (body?: string) => { result.body = body || ''; return result; };
    return result;
}

function requestWithBody(body: any): any {
    const payload = Buffer.from(JSON.stringify(body));
    const req: any = { url: '/api/command-exchange/append' };
    req.on = (event: string, cb: (...args: any[]) => void) => {
        if (event === 'data') cb(payload);
        else if (event === 'end') cb();
        return req;
    };
    return req;
}

@Suite('Gateway command_exchange.* REST (v19-B4)')
export class CommandExchangeRestTest {
    protected async createHarness() {
        const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const store = context.get(SessionStore);
        const owners = new SessionOwnerStore(store);
        const exchange = context.get(TypeOrmCommandExchangeStore);
        const metrics = context.get(ExchangeMetrics);
        const handler = new CommandExchangeHandler(exchange, owners, metrics);
        return { owners, exchange, metrics, handler, context };
    }

    @Test('GET /api/command-exchange/metrics returns a zeroed snapshot')
    async metricsRouteZeroed() {
        const { handler, context } = await this.createHarness();
        try {
            const route = handler.getRoutes().find(r => r.method === 'GET' && r.path === '/api/command-exchange/metrics')!;
            const res = response();
            await route.handler({} as any, res, {});
            expect(res.status).toEqual(200);
            expect(JSON.parse(res.body)).toEqual({ dropped: 0, stale: 0, duplicate: 0, unauthorized: 0 });
        } finally {
            await context.close();
        }
    }

    @Test('REST append writes a record visible to the REST query route')
    async appendThenQuery() {
        const { owners, handler, context } = await this.createHarness();
        await owners.create('ces-rq', 'user-1');
        try {
            const routes = handler.getRoutes();
            const append = routes.find(r => r.method === 'POST' && r.path === '/api/command-exchange/append')!;
            const req = requestWithBody({ sessionId: 'ces-rq', record: { id: 'r-q1', kind: 'command', key: 'bash', content: 'git status', sequence: 0 } });
            setRequestAuth(req, { token: 'x', principalId: 'user-1' });
            const res = response();
            await append.handler(req, res, {});
            expect(res.status).toEqual(200);

            const query = routes.find(r => r.method === 'GET' && r.path === '/api/command-exchange')!;
            const qreq: any = { url: '/api/command-exchange?sessionId=ces-rq' };
            setRequestAuth(qreq, { token: 'x', principalId: 'user-1' });
            const qres = response();
            await query.handler(qreq, qres, {});
            expect(qres.status).toEqual(200);
            const records = (JSON.parse(qres.body) as any).records;
            expect(records.length).toBe(1);
            expect(records[0].id).toBe('r-q1');
        } finally {
            await context.close();
        }
    }

    @Test('REST append counts unauthorized (403) and dropped (400) into metrics')
    async appendCountsMetrics() {
        const { owners, handler, context } = await this.createHarness();
        await owners.create('ces-rest', 'user-1');
        try {
            const routes = handler.getRoutes();
            const append = routes.find(r => r.method === 'POST' && r.path === '/api/command-exchange/append')!;
            const metricsRoute = routes.find(r => r.method === 'GET' && r.path === '/api/command-exchange/metrics')!;

            const foreign = requestWithBody({ sessionId: 'ces-rest', record: { id: 'r-f', kind: 'command', key: 'bash', content: 'x', sequence: 0 } });
            setRequestAuth(foreign, { token: 'x', principalId: 'user-2' });
            const foreignRes = response();
            await append.handler(foreign, foreignRes, {});
            expect(foreignRes.status).toEqual(403);

            const missing = requestWithBody({ record: { id: 'r-m', kind: 'command', key: 'bash', content: 'y', sequence: 1 } });
            setRequestAuth(missing, { token: 'x', principalId: 'user-1' });
            const missingRes = response();
            await append.handler(missing, missingRes, {});
            expect(missingRes.status).toEqual(400);

            const mres = response();
            await metricsRoute.handler({} as any, mres, {});
            expect(mres.status).toEqual(200);
            expect(JSON.parse(mres.body)).toEqual({ dropped: 1, stale: 0, duplicate: 0, unauthorized: 1 });
        } finally {
            await context.close();
        }
    }

    @Test('REST append rejects a stale sessionEpoch with 409 and counts stale')
    async appendStale409() {
        const { owners, handler, context } = await this.createHarness();
        await owners.create('ces-stale-rest', 'user-1');
        try {
            const routes = handler.getRoutes();
            const append = routes.find(r => r.method === 'POST' && r.path === '/api/command-exchange/append')!;
            const metricsRoute = routes.find(r => r.method === 'GET' && r.path === '/api/command-exchange/metrics')!;

            const fresh = requestWithBody({ sessionId: 'ces-stale-rest', record: { id: 'r-s1', kind: 'command', key: 'bash', content: 'fresh', sequence: 0, sessionEpoch: 9 } });
            setRequestAuth(fresh, { token: 'x', principalId: 'user-1' });
            const freshRes = response();
            await append.handler(fresh, freshRes, {});
            expect(freshRes.status).toEqual(200);

            const stale = requestWithBody({ sessionId: 'ces-stale-rest', record: { id: 'r-s2', kind: 'command', key: 'bash', content: 'stale', sequence: 1, sessionEpoch: 3 } });
            setRequestAuth(stale, { token: 'x', principalId: 'user-1' });
            const staleRes = response();
            await append.handler(stale, staleRes, {});
            expect(staleRes.status).toEqual(409);

            const mres = response();
            await metricsRoute.handler({} as any, mres, {});
            expect(mres.status).toEqual(200);
            expect((JSON.parse(mres.body) as any).stale).toEqual(1);
        } finally {
            await context.close();
        }
    }
}
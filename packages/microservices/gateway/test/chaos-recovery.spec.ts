import expect = require('expect');
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { HTTP_RESPONSE, HttpMessageAdapter } from '@tsdi/http-microservice';
import { InMemoryServiceDiscovery } from '../../discovery/src';
import { GatewayInterceptor } from '../src/gateway.interceptor';
import { GatewayRuntime } from '../src/gateway.runtime';

/**
 * Chaos acceptance: one downstream instance dies while traffic is flowing.
 *
 * The gateway must fail over to the surviving endpoint and keep serving; the
 * dead endpoint's per-endpoint circuit opens so later requests skip it. The
 * recovery budget is the plan's 30s ceiling.
 */
describe('Gateway chaos recovery', () => {
    function startInstance(name: string): Promise<{ server: http.Server; port: number }> {
        return new Promise((resolve, reject) => {
            const server = http.createServer((_req, res) => {
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({ instance: name }));
            });
            server.once('error', reject);
            server.listen(0, '127.0.0.1', () => {
                resolve({ server, port: (server.address() as AddressInfo).port });
            });
        });
    }

    function closeServer(server: http.Server): Promise<void> {
        return new Promise(resolve => {
            (server as any).closeAllConnections?.();
            server.close(() => resolve());
        });
    }

    function createContext() {
        const payloads: any[] = [];
        const adapter = {
            setHeader() { return this; },
            setStatus() { return this; },
            setPayload(payload: any) { payloads.push(payload); return this; },
            sendResponse(payload: any) { payloads[payloads.length - 1] = payload; return payload; }
        };
        const context = createRequestContext(createInjector());
        context.set(HttpMessageAdapter, adapter as any);
        context.set(HTTP_RESPONSE, {} as any);
        return { context, payloads };
    }

    function createRequest() {
        const headers: Record<string, string> = {};
        return {
            url: '/api/echo',
            method: 'GET',
            headers,
            query: {},
            getHeader(name: string) {
                return headers[name.toLowerCase()];
            },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
    }

    function call(interceptor: GatewayInterceptor, context: any): Promise<any> {
        return new Promise((resolve, reject) => {
            interceptor.intercept(createRequest(), { handle: () => null } as any, context).subscribe({
                next: value => resolve(value),
                error: reject
            });
        });
    }

    it('fails over to the surviving instance and opens the dead endpoint circuit', async () => {
        const first = await startInstance('instance-a');
        const second = await startInstance('instance-b');
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            id: 'echo-1',
            name: 'echo-service',
            address: `127.0.0.1:${first.port}`,
            protocol: 'http'
        });
        await discovery.register({
            id: 'echo-2',
            name: 'echo-service',
            address: `127.0.0.1:${second.port}`,
            protocol: 'http'
        });

        const runtime = new GatewayRuntime();
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/api/echo',
                service: 'echo-service',
                loadBalance: { strategy: 'round-robin', retries: 1 },
                circuitBreaker: { failureThreshold: 1, resetTimeout: 60_000, perEndpoint: true }
            }]
        }, discovery as any, null as any, runtime, null as any, null as any);

        try {
            // The instance dies after a first successful request proved the route.
            const before = createContext();
            await call(interceptor, before.context);
            expect(before.payloads[0]).toMatchObject({ instance: expect.stringMatching(/^instance-[ab]$/) });

            const killedAt = Date.now();
            await closeServer(first.server);

            const recovered: any[] = [];
            for (let index = 0; index < 8; index++) {
                const ctx = createContext();
                await call(interceptor, ctx.context);
                recovered.push(ctx.payloads[0]);
            }
            const recoveryMs = Date.now() - killedAt;

            expect(recoveryMs).toBeLessThan(30_000);
            expect(recovered.every(payload => payload?.instance === 'instance-b')).toBe(true);

            const snapshot = await runtime.snapshot();
            expect(snapshot.circuits.some(circuit => circuit.open && circuit.key.includes('echo-1'))).toBe(true);

            // Once the dead endpoint is excluded, requests stay fast and healthy.
            const warmStart = Date.now();
            for (let index = 0; index < 5; index++) {
                const ctx = createContext();
                await call(interceptor, ctx.context);
                expect(ctx.payloads[0]).toEqual({ instance: 'instance-b' });
            }
            expect(Date.now() - warmStart).toBeLessThan(5_000);
        } finally {
            interceptor.onDestroy();
            await closeServer(second.server);
            await closeServer(first.server).catch(() => undefined);
        }
    });
});

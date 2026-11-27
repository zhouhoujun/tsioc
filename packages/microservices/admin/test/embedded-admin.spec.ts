import expect = require('expect');
import * as http from 'node:http';
import * as net from 'node:net';
import * as path from 'node:path';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useCookie, useJson, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { useGateway } from '@tsdi/gateway';
import { GatewayAdminController, GatewayAdminModule, useGatewayAdminUi } from '../src';
import { createGatewayRuleWorkflow } from '../src/rules';

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : 0;
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

describe('embedded admin with broad gateway route', () => {
    it('keeps the admin API local and can save a rule', async () => {
        const upstream = http.createServer((_req, res) => {
            res.statusCode = 401;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'Unauthorized' }));
        });
        await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', () => resolve()));
        const upstreamPort = (upstream.address() as net.AddressInfo).port;
        const port = await freePort();

        @Module({
            imports: [LoggerModule, GatewayAdminModule],
            declarations: [GatewayAdminController],
            providers: [
                provideService(
                    useRouter(),
                    useJson(),
                    useCookie(),
                    useGateway({
                        routes: [{
                            path: '/api',
                            service: 'upstream-service',
                            targetUrl: `http://127.0.0.1:${upstreamPort}`,
                            stripPrefix: true
                        }]
                    }),
                    useGatewayAdminUi({
                        root: path.resolve(__dirname, '../web'),
                        prefix: '/admin'
                    }),
                    useHttpTransport({
                        listenOpts: { host: '127.0.0.1', port },
                        asDefault: true
                    })
                )
            ]
        })
        class EmbeddedAdminApp { }

        let ctx: ApplicationContext | undefined;
        try {
            ctx = await Application.run(EmbeddedAdminApp);
            const base = `http://127.0.0.1:${port}`;

            const state = await fetch(`${base}/api/gateway-admin/state`);
            expect(state.status).toBe(200);
            expect((await state.json() as any).auth.mode).toBe('none');

            // Non-admin traffic still goes through the gateway route.
            const proxied = await fetch(`${base}/api/demo`);
            expect(proxied.status).toBe(401);

            const workflow = createGatewayRuleWorkflow('en');
            workflow.id = `e2e_rule_${Date.now().toString(36)}`;
            const saved = await fetch(`${base}/api/gateway-admin/rules/${workflow.id}`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(workflow)
            });
            expect(saved.status).toBe(200);
            const body = await saved.json() as any;
            expect(Array.isArray(body.rules)).toBe(true);
            expect(body.rules.length).toBeGreaterThan(0);

        } finally {
            await ctx?.close();
            await new Promise<void>(resolve => upstream.close(() => resolve()));
        }
    });
});

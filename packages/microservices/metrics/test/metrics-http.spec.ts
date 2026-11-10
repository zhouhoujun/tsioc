import * as http from 'node:http';
import expect = require('expect');
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter } from '@tsdi/service';
import { HttpServer, useHttpTransport } from '@tsdi/http';
import { MetricsModule, MetricsController } from '../src';

function get(port: number, path: string): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port, path }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => text += chunk);
            res.on('end', () => {
                let body: any = text;
                try {
                    body = text ? JSON.parse(text) : null;
                } catch {
                    body = text;
                }
                resolve({ status: res.statusCode ?? 0, body });
            });
        }).on('error', reject);
    });
}

@Module({
    imports: [LoggerModule, MetricsModule],
    declarations: [MetricsController],
    providers: [
        provideService(
            useRouter(),
            useHttpTransport({ listenOpts: { port: 0, host: '127.0.0.1' }, asDefault: true })
        )
    ]
})
class MetricsHttpApp { }

describe('Metrics endpoints', () => {
    let ctx: ApplicationContext;
    let port: number;

    before(async () => {
        ctx = await Application.run(MetricsHttpApp);
        const ref = ctx.runners.getRef(HttpServer as any) as { instance: { server: http.Server } };
        const address = ref.instance.server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Unable to resolve bound port');
        }
        port = address.port;
    });

    after(async () => {
        await ctx?.close();
    });

    it('serves Prometheus and JSON metrics endpoints', async () => {
        const prometheus = await get(port, '/metrics');
        expect(prometheus.status).toBe(200);
        expect(prometheus.body === null || typeof prometheus.body === 'string').toBe(true);

        const json = await get(port, '/metrics/json');
        expect(json.status).toBe(200);
        expect(Array.isArray(json.body.metrics)).toBe(true);
    });
});

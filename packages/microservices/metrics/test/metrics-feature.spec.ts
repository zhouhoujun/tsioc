import * as http from 'node:http';
import expect = require('expect');
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { Transport } from '@tsdi/common';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { HttpServer, useHttpTransport } from '@tsdi/http';
import { MetricsController, useMetrics } from '../src';

@Controller('/ping')
class PingController {
    @Get('/')
    ping() {
        return { ok: true };
    }
}

@Module({
    imports: [LoggerModule],
    declarations: [PingController, MetricsController],
    providers: [
        provideService(
            useRouter(),
            useMetrics({ prefix: 'myapp', defaultLabels: { app: 'test' } }),
            useHttpTransport({ listenOpts: { port: 0, host: '127.0.0.1' }, asDefault: true })
        )
    ]
})
class MetricsInterceptorApp { }

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

describe('useMetrics feature', () => {
    let ctx: ApplicationContext;
    let port: number;

    before(async () => {
        ctx = await Application.run(MetricsInterceptorApp);
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

    it('collects HTTP metrics through the transport interceptor chain', async () => {
        const ping = await get(port, '/ping/');
        expect(ping.status).toBe(200);

        const metrics = await get(port, '/metrics/json');
        expect(metrics.status).toBe(200);
        const requestMetric = metrics.body.metrics.find((metric: any) => metric.name === 'myapp_http_requests_total');
        expect(requestMetric).toBeTruthy();
        expect(requestMetric.value).toBeGreaterThanOrEqual(1);
        expect(requestMetric.labels.app).toBe('test');
    });

    it('allows disabling memory and latency collectors', () => {
        const feature = useMetrics({ includeMemory: false, includeLatency: false })(
            { transport: Transport.HTTP, features: {} } as any
        ) as any;
        const providerNames = feature.providers.map((provider: any) => provider?.name ?? provider?.provide?.name);
        expect(providerNames).not.toContain('MemoryGauge');
        expect(providerNames).not.toContain('LatencyHistogram');
    });
});

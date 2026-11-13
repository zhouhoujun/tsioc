import expect = require('expect');
import { MetricsRegistry } from '../src/registry';
import { MetricsInterceptor } from '../src/interceptors/metrics.interceptor';
import { RequestHandler, RequestContext } from '@tsdi/common';
import { createInjector, Injector } from '@tsdi/ioc';
import { Observable, of, throwError, lastValueFrom } from 'rxjs';
import { RequestCounter } from '../src/counters/request.counter';
import { ErrorCounter } from '../src/counters/error.counter';
import { LatencyHistogram } from '../src/histograms/latency.histogram';

class FakeContext {
    get = () => ({ method: 'GET', pattern: '/test', url: '/test' });
}

describe('MetricsInterceptor', () => {
    it('records request on intercept', (done) => {
        const reg = new MetricsRegistry();
        const reqCounter = new RequestCounter(reg);
        const errCounter = new ErrorCounter(reg);
        const latHist = new LatencyHistogram(reg);
        const interceptor = new MetricsInterceptor(reqCounter, errCounter, latHist);

        const next: RequestHandler<any, any, any> = {
            handle: (input: any, context: any) => {
                return of({ statusCode: 200 });
            }
        };

        lastValueFrom(interceptor.intercept({ method: 'GET', url: '/test' }, next, {} as any)).then(() => {
            const metrics = reg.getMetrics();
            const reqTotal = metrics.find(m => m.name === 'http_requests_total');
            expect(reqTotal!.value).toBe(1);
            done();
        });
    });

    it('normalizes high-cardinality paths before recording labels', async () => {
        const reg = new MetricsRegistry();
        const interceptor = new MetricsInterceptor(
            new RequestCounter(reg),
            new ErrorCounter(reg),
            new LatencyHistogram(reg)
        );
        const next: RequestHandler<any, any, any> = {
            handle: () => of({ statusCode: 200 })
        };
        await lastValueFrom(interceptor.intercept({
            method: 'GET',
            url: '/users/123/orders/550e8400-e29b-41d4-a716-446655440000?token=secret'
        }, next, {} as any));

        const metric = reg.getMetrics().find(m => m.name === 'http_requests_total');
        expect(metric?.labels?.path).toBe('/users/:id/orders/:id');
        expect(metric?.labels?.path).not.toContain('secret');
    });

    it('records error on thrown exception', (done) => {
        const reg = new MetricsRegistry();
        const reqCounter = new RequestCounter(reg);
        const errCounter = new ErrorCounter(reg);
        const latHist = new LatencyHistogram(reg);
        const interceptor = new MetricsInterceptor(reqCounter, errCounter, latHist);

        const next: RequestHandler<any, any, any> = {
            handle: (input: any, context: any) => throwError(() => new Error('fail'))
        };

        lastValueFrom(interceptor.intercept({ method: 'POST', url: '/fail' }, next, {} as any)).catch(() => {
            const metrics = reg.getMetrics();
            const errTotal = metrics.find(m => m.name === 'http_errors_total');
            expect(errTotal!.value).toBe(1);
            done();
        });
    });
});

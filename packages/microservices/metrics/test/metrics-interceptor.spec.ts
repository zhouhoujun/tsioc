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

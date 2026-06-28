import expect = require('expect');
import { DefaultTracer } from '../src/default.tracer';
import { TracingInterceptor } from '../src/interceptors/tracing.interceptor';
import { RequestHandler } from '@tsdi/common';
import { lastValueFrom, of, throwError } from 'rxjs';

describe('TracingInterceptor', () => {
    it('intercept creates span', (done) => {
        const tracer = new DefaultTracer({ serviceName: 'test' });
        const interceptor = new TracingInterceptor(tracer);
        const next: RequestHandler<any, any, any> = {
            handle: (input: any, context: any) => of({ ok: true })
        };
        const context = {
            get: () => ({ getHeaders: () => ({}), setHeader: () => {} })
        };
        lastValueFrom(interceptor.intercept({ method: 'GET', url: '/api' }, next, context as any)).then(() => {
            tracer.close();
            done();
        });
    });

    it('intercept handles error', (done) => {
        const tracer = new DefaultTracer({ serviceName: 'test' });
        const interceptor = new TracingInterceptor(tracer);
        const next: RequestHandler<any, any, any> = {
            handle: (input: any, context: any) => throwError(() => new Error('fail'))
        };
        const context = {
            get: () => ({ getHeaders: () => ({}), setHeader: () => {} })
        };
        lastValueFrom(interceptor.intercept({ method: 'POST', url: '/fail' }, next, context as any)).catch(() => {
            tracer.close();
            done();
        });
    });
});

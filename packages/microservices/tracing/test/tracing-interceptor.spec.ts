import expect = require('expect');
import { DefaultTracer } from '../src/default.tracer';
import { TracingInterceptor } from '../src/interceptors/tracing.interceptor';
import { RequestHandler } from '@tsdi/common';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';

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

    it('runs the downstream handler inside the server span scope', async () => {
        const tracer = new DefaultTracer({ serviceName: 'test' });
        const interceptor = new TracingInterceptor(tracer);
        let serverSpanId: string | undefined;
        let childParentSpanId: string | undefined;
        const next: RequestHandler<any, any, any> = {
            handle: () => {
                const current = tracer.getCurrentSpan();
                serverSpanId = current?.spanId;
                const child = tracer.startSpan('downstream');
                childParentSpanId = child.parentSpanId;
                child.finish();
                return of({ ok: true });
            }
        };
        const context = {
            get: () => ({ getHeaders: () => ({}), setHeader: () => {} })
        };

        await lastValueFrom(interceptor.intercept({ method: 'GET', url: '/api' }, next, context as any));

        expect(serverSpanId).toBeTruthy();
        expect(childParentSpanId).toBe(serverSpanId);
        await tracer.close();
    });

    it('isolates concurrent intercepts', async () => {
        const tracer = new DefaultTracer({ serviceName: 'test' });
        const interceptor = new TracingInterceptor(tracer);
        const seen: Array<{ url: string; current: string | undefined; parent: string | undefined }> = [];
        const next: RequestHandler<any, any, any> = {
            handle: (input: any) => new Observable(subscriber => {
                setTimeout(() => {
                    const current = tracer.getCurrentSpan();
                    const child = tracer.startSpan('child');
                    seen.push({
                        url: input.url,
                        current: current?.attributes['http.url'] as string,
                        parent: child.parentSpanId === current?.spanId ? 'own' : child.parentSpanId
                    });
                    child.finish();
                    subscriber.next({ ok: true });
                    subscriber.complete();
                }, input.url === '/slow' ? 20 : 1);
            })
        };
        const context = {
            get: () => ({ getHeaders: () => ({}), setHeader: () => {} })
        };

        await Promise.all([
            lastValueFrom(interceptor.intercept({ method: 'GET', url: '/slow' }, next, context as any)),
            lastValueFrom(interceptor.intercept({ method: 'GET', url: '/fast' }, next, context as any))
        ]);

        expect(seen).toHaveLength(2);
        for (const item of seen) {
            expect(item.current).toBe(item.url);
            expect(item.parent).toBe('own');
        }
        await tracer.close();
    });
});

import expect = require('expect');
import { lastValueFrom, Observable, of } from 'rxjs';
import { DefaultTracer } from '../src/default.tracer';
import { TracingInterceptor } from '../src/interceptors/tracing.interceptor';
import { brokerDestination, extractBrokerCarrier, normalizeCarrierHeaders } from '../src/carrier';

describe('broker trace carrier', () => {
    it('normalizes kafka buffer headers', () => {
        expect(normalizeCarrierHeaders({
            traceparent: Buffer.from('00-abc-def-01'),
            multiple: [Buffer.from('first'), Buffer.from('second')],
            numeric: 42
        })).toEqual({
            traceparent: '00-abc-def-01',
            multiple: 'first',
            numeric: '42'
        });
    });

    it('normalizes nats MsgHdrs', () => {
        const headers = {
            keys: () => ['traceparent', 'X-Request-Id'],
            get: (key: string) => (key === 'traceparent' ? '00-abc-def-01' : 'req-1')
        };
        expect(normalizeCarrierHeaders(headers)).toEqual({
            traceparent: '00-abc-def-01',
            'x-request-id': 'req-1'
        });
    });

    it('extracts carriers from kafka, amqp, nats and mqtt deliveries', () => {
        const traceparent = '00-abc-def-01';
        expect(extractBrokerCarrier({ message: { headers: { traceparent: Buffer.from(traceparent) } } }))
            .toEqual({ traceparent });
        expect(extractBrokerCarrier({ properties: { headers: { traceparent } } }))
            .toEqual({ traceparent });
        expect(extractBrokerCarrier({
            msg: { headers: { keys: () => ['traceparent'], get: () => traceparent } }
        })).toEqual({ traceparent });
        expect(extractBrokerCarrier({
            packet: { properties: { userProperties: { traceparent } } }
        })).toEqual({ traceparent });
    });

    it('resolves broker destinations', () => {
        expect(brokerDestination({ topic: 'orders' })).toBe('orders');
        expect(brokerDestination({ subject: 'orders' })).toBe('orders');
        expect(brokerDestination({ fields: { routingKey: 'orders.created' } })).toBe('orders.created');
        expect(brokerDestination({})).toBeUndefined();
    });
});

describe('TracingInterceptor broker parentage', () => {
    it('parents the server span from the broker carrier and scopes the handler', async () => {
        const tracer = new DefaultTracer({ serviceName: 'worker' });
        const interceptor = new TracingInterceptor(tracer);
        const clientSpan = tracer.startSpan('client.request', { kind: 'CLIENT' });
        const carrier: Record<string, string> = {};
        tracer.injectContext(clientSpan.context(), carrier);

        const input = {
            topic: 'orders',
            message: { offset: '1', headers: { traceparent: Buffer.from(carrier.traceparent) } }
        };
        let serverSpanId: string | undefined;
        let serverTraceId: string | undefined;
        let serverParentSpanId: string | undefined;
        const next: any = {
            handle: () => {
                const current = tracer.getCurrentSpan();
                serverSpanId = current?.spanId;
                serverTraceId = current?.traceId;
                serverParentSpanId = current?.parentSpanId;
                return of({ ok: true });
            }
        };
        const context: any = { get: () => undefined };

        await lastValueFrom(interceptor.intercept(input as any, next, context));

        expect(serverSpanId).toBeTruthy();
        expect(serverTraceId).toBe(clientSpan.traceId);
        expect(serverParentSpanId).toBe(clientSpan.spanId);
        clientSpan.finish();
        await tracer.close();
    });

    it('starts a root span when the broker message has no carrier', async () => {
        const tracer = new DefaultTracer({ serviceName: 'worker' });
        const interceptor = new TracingInterceptor(tracer);
        let parent: string | undefined = 'unset';
        const next: any = {
            handle: () => {
                parent = tracer.getCurrentSpan()?.parentSpanId;
                return of({ ok: true });
            }
        };

        await lastValueFrom(interceptor.intercept({ topic: 'orders' } as any, next, { get: () => undefined } as any));

        expect(parent).toBeUndefined();
        await tracer.close();
    });

    it('keeps concurrent broker deliveries in their own trace scope', async () => {
        const tracer = new DefaultTracer({ serviceName: 'worker' });
        const interceptor = new TracingInterceptor(tracer);
        const clients = [tracer.startSpan('client-a'), tracer.startSpan('client-b')];
        const carriers = clients.map(span => {
            const carrier: Record<string, string> = {};
            tracer.injectContext(span.context(), carrier);
            return carrier;
        });

        const seen: Array<{ current: string | undefined; parent: string | undefined }> = [];
        const next: any = {
            handle: (input: any) => new Observable(subscriber => {
                setTimeout(() => {
                    const current = tracer.getCurrentSpan();
                    seen.push({
                        current: current?.traceId,
                        parent: current?.parentSpanId
                    });
                    subscriber.next({ ok: true });
                    subscriber.complete();
                }, input.delay);
            })
        };
        const context: any = { get: () => undefined };

        await Promise.all([
            lastValueFrom(interceptor.intercept({
                topic: 'slow',
                delay: 20,
                message: { headers: { traceparent: Buffer.from(carriers[0].traceparent) } }
            } as any, next, context)),
            lastValueFrom(interceptor.intercept({
                topic: 'fast',
                delay: 1,
                message: { headers: { traceparent: Buffer.from(carriers[1].traceparent) } }
            } as any, next, context))
        ]);

        expect(seen).toEqual([
            { current: clients[1].traceId, parent: clients[1].spanId },
            { current: clients[0].traceId, parent: clients[0].spanId }
        ]);
        clients.forEach(span => span.finish());
        await tracer.close();
    });
});

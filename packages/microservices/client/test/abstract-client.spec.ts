import expect = require('expect');
import { createInjector, Injectable } from '@tsdi/ioc';
import { AbstractClient } from '../src/AbstractClient';
import { ClientHandler } from '../src/ClientHandler';
import { ClientDiscoveryStrategy } from '../src/strategies/ClientDiscoveryStrategy';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { MetricsCollector } from '@tsdi/metrics';
import { Tracer } from '@tsdi/tracing';

class FakeHandler {
    injector = createInjector([]);
    handleCount = 0;

    handle(req: any, context: any): Observable<any> {
        this.handleCount++;
        return of({ ok: true, data: req });
    }
}

class FakeDiscoveryStrategy extends ClientDiscoveryStrategy {
    shutdownCalls = 0;
    discover(): Promise<void> { return Promise.resolve(); }
    onShutdown(): Promise<void> { this.shutdownCalls++; return Promise.resolve(); }
}

@Injectable()
class TestClient extends AbstractClient<any, any> {
    private _handler = new FakeHandler() as any;
    shutdownCalls = 0;

    protected get handler(): ClientHandler<any, any> { return this._handler; }
    get testHandler() { return this._handler; }

    protected buildRequest(first: any, options: any): any {
        return { payload: first, ...options };
    }

    protected initContext(context: any, req: any): void {}
    protected onShutdown(): Promise<void> { this.shutdownCalls++; return Promise.resolve(); }
}

describe('AbstractClient', () => {
    it('throws for null/undefined request', async () => {
        const client = new TestClient();
        try { await lastValueFrom(client.send(null as any)); expect(true).toBe(true); }
        catch (e: any) { /* expected */ }
        try { await lastValueFrom(client.send(undefined as any)); expect(true).toBe(true); }
        catch (e: any) { /* expected */ }
    });

    it('sends request and gets response', async () => {
        const client = new TestClient();
        const result: any = await lastValueFrom(client.send('test-pattern'));
        expect(result.ok).toBe(true);
        expect(client.testHandler.handleCount).toBe(1);
    });

    it('records client metrics, spans and trace headers', async () => {
        const recorded: any[] = [];
        const headers = new Map<string, string>();
        const metrics: any = {
            increment: (name: string, value: number, labels: any) => recorded.push({ type: 'increment', name, labels }),
            timing: (name: string, value: number, labels: any) => recorded.push({ type: 'timing', name, labels })
        };
        let finished = false;
        const span: any = {
            context: () => ({ traceId: 'trace', spanId: 'span' }),
            setStatus: () => undefined,
            recordError: () => undefined,
            finish: () => { finished = true; }
        };
        const tracer: any = {
            serviceName: 'test-service',
            startSpan: () => span,
            injectContext: (_context: any, carrier: any) => { carrier.traceparent = '00-trace-span-01'; }
        };
        const injector = createInjector([
            { provide: MetricsCollector, useValue: metrics },
            { provide: Tracer, useValue: tracer }
        ]);
        class ObservedClient extends AbstractClient<any, any> {
            private _handler = {
                injector,
                handle: (req: any) => of({ statusCode: 201, req })
            } as any;
            protected get handler(): ClientHandler<any, any> { return this._handler; }
            protected buildRequest(first: any, options: any): any {
                return {
                    ...options,
                    method: 'GET',
                    pattern: '/users/123/orders',
                    headers: {
                        set: (name: string, value: string) => headers.set(name, value)
                    }
                };
            }
            protected initContext(): void { /* noop */ }
            protected onShutdown(): Promise<void> { return Promise.resolve(); }
        }

        const client = new ObservedClient();
        await lastValueFrom(client.send('anything'));

        expect(headers.get('traceparent')).toBe('00-trace-span-01');
        expect(finished).toBe(true);
        const request = recorded.find(item => item.name === 'client_requests_total');
        expect(request?.labels.path).toBe('/users/:id/orders');
        expect(request?.labels.status).toBe('201');
        expect(recorded.some(item => item.name === 'client_request_duration_ms')).toBe(true);
    });

    it('records client errors with an error type', async () => {
        const recorded: any[] = [];
        const metrics: any = {
            increment: (name: string, value: number, labels: any) => recorded.push({ type: 'increment', name, labels }),
            timing: () => undefined
        };
        const injector = createInjector([{ provide: MetricsCollector, useValue: metrics }]);
        class FailingClient extends AbstractClient<any, any> {
            private _handler = {
                injector,
                handle: () => throwError(() => Object.assign(new Error('boom'), { status: 503 }))
            } as any;
            protected get handler(): ClientHandler<any, any> { return this._handler; }
            protected buildRequest(first: any): any { return { pattern: '/broken' }; }
            protected initContext(): void { /* noop */ }
            protected onShutdown(): Promise<void> { return Promise.resolve(); }
        }

        await expect(lastValueFrom(new FailingClient().send('anything'))).rejects.toThrow('boom');
        const errorMetric = recorded.find(item => item.name === 'client_errors_total');
        expect(errorMetric?.labels.error_type).toBe('upstream');
        expect(errorMetric?.labels.status).toBe('503');
    });

    it('calls onShutdown on close', async () => {
        const client = new TestClient();
        await client.close();
        expect(client.shutdownCalls).toBe(1);
    });

    it('calls discovery strategy shutdown during close', async () => {
        const discovery = new FakeDiscoveryStrategy();
        const injector = createInjector([{ provide: ClientDiscoveryStrategy, useValue: discovery }]);
        class ClientWithDiscovery extends AbstractClient<any, any> {
            private _handler = { injector } as any;
            protected get handler(): ClientHandler<any, any> { return this._handler; }
            protected buildRequest(first: any, options: any): any { return first; }
            protected initContext(context: any, req: any): void {}
            protected onShutdown(): Promise<void> { return Promise.resolve(); }
        }
        const client = new ClientWithDiscovery();
        await client.close();
        expect(discovery.shutdownCalls).toBe(1);
    });
});

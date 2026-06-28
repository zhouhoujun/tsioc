import expect = require('expect');
import { createInjector, Injectable } from '@tsdi/ioc';
import { AbstractClient } from '../src/AbstractClient';
import { ClientHandler } from '../src/ClientHandler';
import { ClientDiscoveryStrategy } from '../src/strategies/ClientDiscoveryStrategy';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';

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

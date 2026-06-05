import expect = require('expect');
import { of, lastValueFrom } from 'rxjs';
import { createInjector } from '@tsdi/ioc';
import { Header, PacketIdGenerator, PatternFormatter, StatusMessageAdapter, StreamAdapter, TransferSide, createRequestContext, useCatch } from '@tsdi/common';
import { TcpRequest } from '@tsdi/tcp';
import { useJsonPacket } from '../src/providers';

class TestStatusAdapter extends StatusMessageAdapter<any, any, number> {
    private headers = new Map<string, Header>();
    private statusCode?: number;
    private statusMessageText?: string;
    private errorValue: any;
    private bodyValue: any;

    constructor(public request: any = {}, public response: any = {}) {
        super();
    }

    get status(): number {
        return this.statusCode ?? 0;
    }

    set status(value: number) {
        this.statusCode = value;
    }

    get isHandled(): boolean {
        return this.statusCode != null || this.errorValue != null || this.bodyValue != null;
    }

    get isCommitted(): boolean {
        return false;
    }

    get query(): Record<string, any> {
        return this.request?.query ?? {};
    }

    async handle(): Promise<void> { return; }
    commit(): void { return; }
    async destroy(): Promise<void> { return; }

    read(): any { return undefined; }
    write(body: any): void { this.bodyValue = body; }
    setHeader(name: string, value: Header): void { this.headers.set(name, value); }
    removeHeader(name: string): void { this.headers.delete(name); }
    writeError(error: any): void { this.errorValue = error; }
    setStatus(code: any, message?: string): void { this.statusCode = code; this.statusMessageText = message; }
    getStatus(): any { return this.statusCode; }
    getStatusMessage(): any { return this.statusMessageText; }
    getError(): any { return this.errorValue; }
    getBody(): any { return this.bodyValue; }
    hasHeader(name: string): boolean { return this.headers.has(name); }
    isHeadersSent(): boolean { return false; }
    getHeader(name: string): any { return this.request?.headers?.[name]; }
    getResponseHeaderNames(): string[] { return Array.from(this.headers.keys()); }
    getResponseHeader(name: string): Header | undefined { return this.headers.get(name); }
}

describe('transport json packet', () => {
    function createContext(adapter?: any) {
        const injector = createInjector([
            { provide: StreamAdapter, useValue: { isReadable: () => false } },
        ] as any);
        const context = createRequestContext(injector);
        context.set(PatternFormatter as any, { format: (pattern: any) => String(pattern) });
        if (adapter) {
            context.setMessageAdapter(adapter);
        }
        return context;
    }

    it('adds PacketIdGenerator provider on client side', () => {
        const config: any = {
            side: TransferSide.client,
            transfer: {},
            providers: []
        };
        const interceptors = useJsonPacket()(config);
        expect(Array.isArray(interceptors)).toBe(true);
        expect(config.providers.some((provider: any) => provider.provide === PacketIdGenerator)).toBe(true);
    });

    it('does not add PacketIdGenerator provider on server side', () => {
        const config: any = {
            side: TransferSide.server,
            transfer: {},
            providers: []
        };
        const interceptors = useJsonPacket()(config);
        expect(Array.isArray(interceptors)).toBe(true);
        expect(config.providers.some((provider: any) => provider.provide === PacketIdGenerator)).toBe(false);
    });

    it('maps client requests into json payloads with parsed query and pattern body aliasing', async () => {
        const config: any = { side: TransferSide.client, transfer: {}, providers: [] };
        const interceptors = useJsonPacket()(config) as Function[];
        const jsonInterceptor = interceptors[2];
        const context = createContext();
        const request = new TcpRequest('/users?name=zhou', 'users.create', {
            method: 'POST',
            body: { id: 'u1' },
            params: { page: '1' },
            headers: { authorization: 'Bearer token' }
        });
        let captured = '';

        await lastValueFrom(jsonInterceptor(request, (payload: string) => {
            captured = payload;
            return of('{}');
        }, context));

        expect(JSON.parse(captured)).toEqual({
            url: '/users',
            query: { name: 'zhou', page: '1' },
            pattern: 'users.create',
            method: 'POST',
            params: { page: '1' },
            payload: { id: 'u1' },
            headers: { authorization: 'Bearer token' }
        });
    });

    it('maps server responses from message adapter status headers and body', async () => {
        const config: any = { side: TransferSide.server, transfer: {}, providers: [] };
        const interceptors = useJsonPacket()(config) as Function[];
        const jsonInterceptor = interceptors[4];
        const adapter = new TestStatusAdapter();
        adapter.setStatus(202, 'Accepted');
        adapter.setHeader('x-test', '1');
        adapter.write({ ok: true });
        const context = createContext(adapter);
        const response = await lastValueFrom(jsonInterceptor(JSON.stringify({ body: { id: '1' } }), () => of({ id: 'resp-1' }), context));

        expect(JSON.parse(response as string)).toEqual({
            id: 'resp-1',
            status: 202,
            statusCode: 202,
            statusMessage: 'Accepted',
            headers: { 'x-test': '1' },
            body: { ok: true }
        });
    });

    it('places socket interceptor at the tail of client and head-side of server flow', () => {
        const client = useJsonPacket()({ side: TransferSide.client, transfer: {}, providers: [] } as any) as Function[];
        const server = useJsonPacket()({ side: TransferSide.server, transfer: {}, providers: [] } as any) as Function[];
        expect(client.length).toBeGreaterThan(3);
        expect(server.length).toBeGreaterThan(3);
        expect(client[0]).toBe(useCatch);
        expect(server[0]).toBe(useCatch);
        expect(client[client.length - 1]).not.toBe(server[server.length - 1]);
    });
});

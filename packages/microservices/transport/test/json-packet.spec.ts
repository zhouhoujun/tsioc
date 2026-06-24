import expect = require('expect');
import { of, lastValueFrom } from 'rxjs';
import { createInjector } from '@tsdi/ioc';
import { Header, PacketIdGenerator, PatternFormatter, StatusMessageAdapter, StreamAdapter, TransferSide, createRequestContext, useCatch, ErrorResponse } from '@tsdi/common';
import { TcpRequest } from '@tsdi/tcp';
import { useJsonPacket } from '../src/providers';
import { RESOLVER_PROVIDERS } from '@tsdi/core';
import { EventEmitter } from 'node:events';
import { PassThrough, Readable, Writable, pipeline as nodePipeline } from 'node:stream';
import { pipeline as promisePipeline } from 'node:stream/promises';
import * as zlib from 'node:zlib';

class TestStreamAdapter extends StreamAdapter {
    async read<T extends Uint8Array>(readable: any): Promise<T> {
        const chunks: Uint8Array[] = [];
        for await (const chunk of readable) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks) as unknown as T;
    }
    async pipeTo(source: any, destination: any, options?: { end?: boolean; signal?: any; }): Promise<void> {
        await promisePipeline(source, destination, options);
    }
    pipeline<T extends any>(...args: any[]): T {
        return (nodePipeline as any)(...args) as T;
    }
    jsonSreamify(value: any): any {
        return Readable.from([JSON.stringify(value)]);
    }
    isStream(target: any): target is any {
        return !!target && typeof target.pipe === 'function';
    }
    isEventEmitter(target: any): target is any {
        return target instanceof EventEmitter;
    }
    isReadable(stream: any): stream is any {
        return !!stream && typeof stream.pipe === 'function' && typeof stream.on === 'function';
    }
    isWritable(stream: any): stream is any {
        return !!stream && typeof stream.write === 'function';
    }
    createWritable(options?: any): any {
        return new Writable(options);
    }
    createPassThrough(options?: any): any {
        return new PassThrough(options);
    }
    getZipConstants<T = any>(): T {
        return zlib.constants as T;
    }
    gzip<T extends Uint8Array>(buff: T): Promise<T> {
        return Promise.resolve(buff);
    }
    gunzip<T extends Uint8Array>(buff: T): Promise<T> {
        return Promise.resolve(buff);
    }
    createGzip(): any {
        return new PassThrough();
    }
    createGunzip(): any {
        return new PassThrough();
    }
    createInflate(): any {
        return new PassThrough();
    }
    createInflateRaw(): any {
        return new PassThrough();
    }
    createBrotliCompress(): any {
        return new PassThrough();
    }
    createBrotliDecompress(): any {
        return new PassThrough();
    }
    isDuplex(target: any): target is any {
        return this.isReadable(target) && this.isWritable(target);
    }
    isFormDataLike(): boolean {
        return false;
    }
    rawbody(stream: any): Promise<any> {
        return this.read(stream);
    }
    createFormData(): any {
        throw new Error('Not implemented for tests');
    }
    isJson(target: any): boolean {
        return !!target && typeof target === 'object' && !Buffer.isBuffer(target) && !this.isStream(target);
    }
}

class TestStatusAdapter extends StatusMessageAdapter<any, any, number> {
    private headers = new Map<string, Header>();
    private statusCode?: number;
    private statusMessageText?: string;

    protected onPayloadChange(payload: any): any {
        return payload;
    }

    protected onErrorChange(error: any): any {
        return error;
    }

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
        return this.statusCode != null || this.error != null || this.payload != null;
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

    read(section?: any, name?: string): any {
        if (section === 'payload' || section === 'body') {
            const payload = this.request?.payload ?? this.request?.body;
            return name ? payload?.[name] : payload;
        }
        return undefined;
    }
    get payload(): any { return (this as any)._payload; }
    set payload(payload: any) { (this as any)._payload = this.onPayloadChange(payload); }
    get error(): any { return (this as any)._error; }
    set error(error: any) { (this as any)._error = this.onErrorChange(error); }
    setHeader(name: string, value: Header): this { this.headers.set(name, value); return this; }
    removeHeader(name: string): this { this.headers.delete(name); return this; }
    setStatus(code: any, message?: string): this { this.statusCode = code; this.statusMessageText = message; return this; }
    getStatusMessage(): any { return this.statusMessageText; }
    hasHeader(name: string): boolean { return this.headers.has(name); }
    isHeadersSent(): boolean { return false; }
    getHeader(name: string): any { return this.request?.headers?.[name]; }
    getResponseHeaderNames(): string[] { return Array.from(this.headers.keys()); }
    getResponseHeader(name: string): Header | undefined { return this.headers.get(name); }
}

describe('transport json packet', () => {
    function createContext(adapter?: any) {
        const injector = createInjector([
            RESOLVER_PROVIDERS as any,
            { provide: StreamAdapter, useClass: TestStreamAdapter },
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
        adapter.setPayload({ ok: true });
        const context = createContext(adapter);
        const response = await lastValueFrom(jsonInterceptor(JSON.stringify({ body: { id: '1' } }), () => of({ id: 'resp-1' }), context));

        expect(JSON.parse(response as string)).toEqual({
            id: 'resp-1',
            status: 202,
            statusMessage: 'Accepted',
            headers: { 'x-test': '1' },
            body: { ok: true },
            payload: { ok: true }
        });
    });

    it('places socket interceptor at the tail of client and head-side of server flow', () => {
        const client = useJsonPacket()({ side: TransferSide.client, transfer: {}, providers: [] } as any) as Function[];
        const server = useJsonPacket()({ side: TransferSide.server, transfer: {}, providers: [] } as any) as Function[];
        expect(client.length).toBeGreaterThan(3);
        expect(server.length).toBeGreaterThan(3);
        expect(client[0]).not.toBe(useCatch);
        expect(server[0]).toBe(useCatch);
        expect(client[client.length - 1]).not.toBe(server[server.length - 1]);
    });

    it('throws ErrorResponse for body observe error packets on client side', async () => {
        const config: any = { side: TransferSide.client, transfer: {}, providers: [] };
        const interceptors = useJsonPacket()(config) as Function[];
        const packetInterceptor = interceptors[0];
        const context = createContext();
        const request = new TcpRequest('/users', null, { observe: 'body' as any });
        request.id = 'req-1';

        const result$ = packetInterceptor(request, () => of({
            id: 'req-1',
            status: 500,
            statusMessage: 'Boom',
            error: { message: 'Boom' }
        }), context);

        await expect(lastValueFrom(result$)).rejects.toBeInstanceOf(ErrorResponse);
    });
});

import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, ErrorResponse, REQUEST, StreamAdapter } from '@tsdi/common';
import { SOCKET } from '../src/context';
import { useJsonPacket } from '../src/providers';
import { createRequestHandler } from '@tsdi/common';
import { lastValueFrom, take, toArray } from 'rxjs';
import { TcpRequest } from '@tsdi/tcp';
import { RESOLVER_PROVIDERS } from '@tsdi/core';
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

class FakeSocket extends EventEmitter {
    public writes: any[] = [];

    write(data: any, callback?: (err?: Error | null) => void) {
        this.writes.push(data);
        callback?.(null);
        return true;
    }

    send(data: any, callback?: (err?: Error | null) => void) {
        this.writes.push(data);
        callback?.(null);
        return true;
    }
}

describe('socket client contract', () => {
    function createBackend() {
        const config: any = {
            side: 0,
            transport: 'tcp',
            transfer: {},
            providers: [
                RESOLVER_PROVIDERS as any,
                { provide: StreamAdapter, useClass: TestStreamAdapter }
            ],
            features: { defaultTransfer: useJsonPacket() }
        };
        const injector = createInjector(config.providers as any);
        return createRequestHandler(injector, config) as any;
    }

    function createContext(request: TcpRequest<any>, socket: FakeSocket) {
        const injector = createInjector([
            RESOLVER_PROVIDERS as any,
            { provide: StreamAdapter, useClass: TestStreamAdapter }
        ] as any);
        return createRequestContext(injector, [
            [REQUEST, request],
            [SOCKET, socket]
        ]);
    }

    it('returns ResponseEventPacket for emit', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.emit', null, { observe: 'events' } as any, 'POST');

        const result = await lastValueFrom(handler.handle(request, createContext(request, socket)));
        expect(result).toEqual({ type: 0 });
    });

    it('returns body for body observe', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.body', null, { observe: 'body' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 200, payload: 'done' }) + '\r\n'));
        }, 0);

        const result = await lastValueFrom(result$);
        expect(result).toBe('done');
    });

    it('returns full response for response observe', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.response', null, { observe: 'response' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 201, statusMessage: 'Created', payload: { ok: true } }) + '\r\n'));
        }, 0);

        const result: any = await lastValueFrom(result$);
        expect(result.status).toBe(201);
        expect(result.statusText).toBe('Created');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.error', null, { observe: 'body' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 500, statusMessage: 'Boom', error: { message: 'Boom' } }) + '\r\n'));
        }, 0);

        await expect(lastValueFrom(result$)).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const handler = createBackend();
        const socket = new FakeSocket();
        const request = new TcpRequest('/topic.observe', null, { observe: 'observe' } as any, 'POST');
        const result$ = handler.handle(request, createContext(request, socket));
        const resultPromise = lastValueFrom(result$.pipe(take(2), toArray()));

        setTimeout(() => {
            const sent = JSON.parse(socket.writes[0].toString());
            socket.emit('data', Buffer.from(JSON.stringify({ id: 'other', status: 200, payload: 'skip' }) + '\r\n'));
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 200, payload: 'one' }) + '\r\n'));
            socket.emit('data', Buffer.from(JSON.stringify({ id: sent.id, status: 200, payload: 'two' }) + '\r\n'));
        }, 0);

        const result = await resultPromise;
        expect(result).toEqual(['one', 'two']);
    });
});

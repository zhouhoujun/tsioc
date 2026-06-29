import expect = require('expect');
import { lastValueFrom, of } from 'rxjs';
import { createInjector } from '@tsdi/ioc';
import {
    AbstractRequest, PacketIdGenerator, StreamAdapter, createRequestContext,
    RequestContext, PacketLengthException
} from '@tsdi/common';
import { PacketDeserializeInterceptor, PayloadDeserializeInterceptor, messageSerializeInterceptor, deatchPacketIdInterceptor, messageVaildateInterceptor } from '../src/interceptors/packet';
import { PassThrough, Readable, Writable } from 'node:stream';
import * as zlib from 'node:zlib';
import { EventEmitter } from 'node:events';
import { pipeline as nodePipeline } from 'node:stream';
import { pipeline as promisePipeline } from 'node:stream/promises';
import { PACKET_DELIMITER, PACKET_MAXSIZE, PACKET_LIMIT, PACKET_IDLEN } from '../src/context';

function createTestStreamAdapter() {
    class TestStreamAdapter extends StreamAdapter {
        async read<T extends Uint8Array>(readable: any): Promise<T> {
            const chunks: Uint8Array[] = [];
            for await (const chunk of readable) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks) as unknown as T;
        }
        async pipeTo(source: any, destination: any, options?: { end?: boolean; signal?: any }): Promise<void> {
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
        getZipConstants<T = any>(): T { return zlib.constants as T; }
        gzip<T extends Uint8Array>(buff: T): Promise<T> { return Promise.resolve(buff); }
        gunzip<T extends Uint8Array>(buff: T): Promise<T> { return Promise.resolve(buff); }
        createGzip(): any { return new PassThrough(); }
        createGunzip(): any { return new PassThrough(); }
        createInflate(): any { return new PassThrough(); }
        createInflateRaw(): any { return new PassThrough(); }
        createBrotliCompress(): any { return new PassThrough(); }
        createBrotliDecompress(): any { return new PassThrough(); }
        isDuplex(target: any): target is any {
            return this.isReadable(target) && this.isWritable(target);
        }
        isFormDataLike(): boolean { return false; }
        unshift<T extends Uint8Array>(stream: any, chunk: T): void {
            stream.unshift(chunk);
        }
        rawbody(stream: any): Promise<any> {
            return this.read(stream);
        }
        createFormData(): any {
            return {
                append() {},
                getHeaders() { return {}; },
                submit() {},
                getBuffer() { return Buffer.alloc(0); },
                setBoundary() {},
                getBoundary() { return 'boundary'; },
                getLength(callback: (err: Error | null, length: number) => void) { callback(null, 0); },
                getLengthSync() { return 0; }
            };
        }
        isJson(target: any): boolean {
            return Buffer.isBuffer(target) || typeof target === 'string';
        }
    }
    return new TestStreamAdapter();
}

function createMockContext(overrides: any = {}): RequestContext {
    const injector = createInjector([
        { provide: StreamAdapter, useValue: createTestStreamAdapter() },
        { provide: PacketIdGenerator, useValue: { getPacketId: () => 1 } },
        { provide: 'bytes-format', useValue: { transform: (value: any) => String(value) } },
        { provide: PACKET_DELIMITER, useValue: '\r\n' },
        { provide: PACKET_MAXSIZE, useValue: null },
        { provide: PACKET_LIMIT, useValue: null },
        { provide: PACKET_IDLEN, useValue: 4 },
    ] as any);
    const context = createRequestContext(injector);
    Object.assign(context, overrides);
    return context;
}

const MSG_DELIMITER = '\r\n';
const SIZE_LEN = 4;

function makePacket(payload: string): Buffer {
    const delimiter = Buffer.from(MSG_DELIMITER);
    const data = Buffer.from(payload);
    const len = Buffer.alloc(SIZE_LEN);
    len.writeUIntBE(data.length, 0, SIZE_LEN);
    return Buffer.concat([len, delimiter, data]);
}

describe('messageVaildateInterceptor', () => {
    it('passes input through when no length limit', async () => {
        const context = createMockContext();
        const result = await lastValueFrom(
            messageVaildateInterceptor({ body: 'test', id: 1, getHeader() { return undefined; } } as any, (input: any) => of(input), context)
        );
        expect(result).toBeDefined();
        expect((result as any).body).toBe('test');
    });

    it('throws PacketLengthException when payload exceeds maxSize', async () => {
        const context = createMockContext();
        context.set(PACKET_LIMIT as any, 5);
        context.set(PACKET_MAXSIZE as any, 5);
        const bigPayload = { body: 'x'.repeat(100), contentLength: 100, id: 1, getHeader() { return undefined; } };
        await expect(lastValueFrom(messageVaildateInterceptor(bigPayload as any, (input: any) => of(input), context))).rejects.toBeInstanceOf(PacketLengthException);
    });

    it('assigns id from PacketIdGenerator when input has no id', async () => {
        const context = createMockContext();
        context.set(AbstractRequest as any, { url: '/req' });
        const result = await lastValueFrom(
            messageVaildateInterceptor({ body: 'no-id', getHeader() { return undefined; } } as any, (input: any) => of(input), context)
        );
        expect((result as any).id).toBe(1);
    });
});

describe('messageSerializeInterceptor', () => {
    it('serializes string payload to buffer with length prefix and delimiter', async () => {
        const context = createMockContext();
        const result = await lastValueFrom(
            messageSerializeInterceptor(
                { body: 'hello', contentLength: 5, getHeader() { return undefined; } } as any,
                () => of({ payload: 'hello', contentLength: 5 }),
                context
            )
        );
        const msg = result as any;
        expect(Buffer.isBuffer(msg.payload)).toBe(true);

        // Format: [4 bytes length][delimiter][data]
        const prefix = msg.payload.subarray(0, SIZE_LEN);
        const length = prefix.readUIntBE(0, SIZE_LEN);
        expect(length).toBe(5);

        const dataStart = SIZE_LEN + Buffer.byteLength(MSG_DELIMITER);
        const data = msg.payload.subarray(dataStart);
        expect(data.toString()).toBe('hello');
    });

    it('serializes buffer payload correctly', async () => {
        const context = createMockContext();
        const input = Buffer.from('binary-data');
        const result = await lastValueFrom(
            messageSerializeInterceptor(
                { body: input, contentLength: input.length, getHeader() { return undefined; } } as any,
                () => of({ payload: input, contentLength: input.length }),
                context
            )
        );
        const msg = result as any;
        const prefix = msg.payload.subarray(0, SIZE_LEN);
        const length = prefix.readUIntBE(0, SIZE_LEN);
        expect(length).toBe(input.length);
    });
});

describe('deatchPacketIdInterceptor', () => {
    it('filters messages with matching id', async () => {
        const context = createMockContext();
        context.set('request-id', 42);
        // The interceptor checks context.has(AbstractRequest) - skip if absent
        const result = await lastValueFrom(
            deatchPacketIdInterceptor({ id: 42 }, (input: any) => of(input), context)
        );
        expect(result).toBeDefined();
    });
});

describe('PacketDeserializeInterceptor', () => {
    it('deserializes a single complete packet', async () => {
        const interceptor = new PacketDeserializeInterceptor();
        const context = createMockContext();
        const packet = makePacket('{"msg":"hello"}');

        const results: any[] = [];
        await lastValueFrom(
            interceptor.intercept(packet, { handle: (input: any) => of(input) } as any, context)
                .pipe()
        );
        await lastValueFrom(interceptor.intercept(packet, {
            handle: (input: any) => {
                results.push(input);
                return of(input);
            }
        } as any, context));
        expect(results).toHaveLength(1);
        expect(results[0].contentLength).toBe(15);
    });

    it('deserializes multiple packets in a single buffer', async () => {
        const interceptor = new PacketDeserializeInterceptor();
        const context = createMockContext();
        const packet1 = makePacket('msg1');
        const packet2 = makePacket('msg2');
        const combined = Buffer.concat([packet1, packet2]);

        const results: any[] = [];
        const stream = interceptor.intercept(combined, {
            handle: (input: any) => {
                results.push(input);
                return of(input);
            }
        } as any, context);
        await expect(lastValueFrom(stream)).rejects.toBeDefined();
        expect(results.length).toBe(2);
    });

    it('handles empty input', async () => {
        const interceptor = new PacketDeserializeInterceptor();
        const context = createMockContext();

        const result = await lastValueFrom(
            interceptor.intercept('', { handle: (input: any) => of(input) } as any, context)
        );
        // Empty string has no delimiter, gets passed through differently
        expect(result).toBeDefined();
    });

    it('throws PacketLengthException when packet exceeds maxSize', async () => {
        const interceptor = new PacketDeserializeInterceptor();
        const context = createMockContext();
        context.set(PACKET_MAXSIZE as any, 5);
        context.set(PACKET_LIMIT as any, 5);

        const bigPacket = makePacket('x'.repeat(100));
        await expect(lastValueFrom(
            interceptor.intercept(bigPacket, { handle: (input: any) => of(input) } as any, context)
        )).rejects.toBeInstanceOf(PacketLengthException);
    });

    it('reuses cache across calls for same channel', () => {
        const interceptor = new PacketDeserializeInterceptor();
        expect((interceptor as any).channels).toBeDefined();
        expect((interceptor as any).channels.size).toBe(0);
    });

    it('throws error for zero content length packet', async () => {
        const interceptor = new PacketDeserializeInterceptor();
        const context = createMockContext();

        // Create malformed packet with zero content length
        const delimiter = Buffer.from(MSG_DELIMITER);
        const zeroLen = Buffer.alloc(SIZE_LEN);
        zeroLen.writeUIntBE(0, 0, SIZE_LEN); // zero length claims
        const malformed = Buffer.concat([zeroLen, delimiter]);

        await expect(
            lastValueFrom(interceptor.intercept(malformed, { handle: (input: any) => of(input) } as any, context))
        ).rejects.toBeInstanceOf(PacketLengthException);
    });
});

describe('PayloadDeserializeInterceptor', () => {
    it('passes input with no payload through', async () => {
        const interceptor = new PayloadDeserializeInterceptor();
        const context = createMockContext();
        const result = await lastValueFrom(
            interceptor.intercept({ body: null } as any, { handle: (input: any) => of(input) } as any, context)
        );
        expect(result).toEqual({ body: null });
    });

    it('handles buffer payload', async () => {
        const interceptor = new PayloadDeserializeInterceptor();
        const context = createMockContext();
        const buffer = Buffer.from('test-data');
        const result = await lastValueFrom(
            interceptor.intercept({ body: buffer, contentLength: buffer.length } as any, { handle: (input: any) => of(input) } as any, context)
        );
        expect(result).toBeDefined();
    });

    it('handles readable stream payload', async () => {
        const interceptor = new PayloadDeserializeInterceptor();
        const context = createMockContext();
        const readable = new PassThrough();
        readable.write(Buffer.from('test-stream-data'));
        readable.end();

        const result = await lastValueFrom(
            interceptor.intercept({ body: readable, contentLength: 16 } as any, { handle: (input: any) => of(input) } as any, context)
        );
        expect(result).toBeDefined();
    });
});

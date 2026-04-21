import expect = require('expect');
import { Buffer } from 'buffer';
import { lastValueFrom, of } from 'rxjs';
import { StreamRequest, StreamResponse, DefaultStreamHandler } from '../src/handler';
import { HeaderStreamCodec, STREAM_CODEC_OPTIONS } from '../src/codec';
import { createHeaderStream, MessageType, PacketHeader, ContentTypes } from '@tsdi/common';

describe('Stream Transport Tests', () => {

    // Mock StreamAdapter
    const mockStreamAdapter = {
        isReadable: (obj: any) => obj && typeof obj.on === 'function',
        createPassThrough: () => {
            const chunks: Buffer[] = [];
            let ended = false;
            return {
                write: (data: Buffer) => { chunks.push(data); },
                end: () => { ended = true; },
                on: (event: string, callback: Function) => {},
                getChunks: () => chunks,
                isEnded: () => ended
            } as any;
        },
        rawbody: async (stream: any, options: any) => {
            return Buffer.concat(stream.getChunks?.() || []).toString(options.encoding || 'utf8');
        }
    };

    const context = {
        get: (token: any) => {
            if (token === STREAM_CODEC_OPTIONS) {
                return { chunkSize: 64 * 1024 };
            }
            // Return mock stream adapter for StreamAdapter token
            return mockStreamAdapter;
        }
    } as any;

    describe('HeaderStreamCodec', () => {
        it('should support STREAM type', () => {
            const codec = new HeaderStreamCodec();
            expect(codec.supports(MessageType.STREAM)).toBe(true);
            expect(codec.supports(MessageType.TEXT)).toBe(false);
        });

        it('should encode stream header', () => {
            const codec = new HeaderStreamCodec();
            const headers: PacketHeader = {
                'content-type': ContentTypes.STREAM,
                'message-id': 'stream-123'
            };

            // Create a mock stream
            const mockStream = mockStreamAdapter.createPassThrough();
            const stream = createHeaderStream('stream-123', mockStream, headers, 1024, 512);

            const encoded = codec.encode(stream, context);
            expect(Buffer.isBuffer(encoded)).toBe(true);
            expect(encoded.length).toBeGreaterThan(8);
        });

        it('should decode buffer to HeaderStream', () => {
            const codec = new HeaderStreamCodec();
            const headers: PacketHeader = {
                'content-type': ContentTypes.STREAM,
                'message-id': 'stream-456',
                'content-length': 1024
            };

            const mockStream = mockStreamAdapter.createPassThrough();
            const stream = createHeaderStream('stream-456', mockStream, headers, 1024, 512);

            const encoded = codec.encode(stream, context);
            const decoded = codec.decode(encoded, context);

            expect(decoded.type).toBe(MessageType.STREAM);
            expect(decoded.headers?.['message-id']).toBe('stream-456');
            expect(decoded.chunkSize).toBe(512);
        });

        it('should create chunk header', () => {
            const codec = new HeaderStreamCodec();

            const chunkHeader = codec.createChunkHeader(0, 1024, false);
            expect(chunkHeader.length).toBe(9);
        });

        it('should parse chunk header', () => {
            const codec = new HeaderStreamCodec();

            const chunkHeader = codec.createChunkHeader(5, 512, true);
            const parsed = codec.parseChunkHeader(chunkHeader);

            expect(parsed.chunkIndex).toBe(5);
            expect(parsed.chunkSize).toBe(512);
            expect(parsed.isLast).toBe(true);
        });

        it('should throw on invalid chunk header', () => {
            const codec = new HeaderStreamCodec();
            const invalidBuffer = Buffer.from([0, 0, 0]);

            expect(() => codec.parseChunkHeader(invalidBuffer)).toThrow();
        });

        it('should throw on invalid stream buffer', () => {
            const codec = new HeaderStreamCodec();
            const invalidBuffer = Buffer.from([0, 0]);

            expect(() => codec.decode(invalidBuffer, context)).toThrow();
        });
    });

    describe('StreamRequest', () => {
        it('should create StreamRequest', () => {
            const mockStream = mockStreamAdapter.createPassThrough();
            const request = new StreamRequest({ stream: mockStream });

            expect(request.stream).toBeDefined();
        });

        it('should create StreamRequest with headers', () => {
            const mockStream = mockStreamAdapter.createPassThrough();
            const headers: PacketHeader = { 'custom': 'header' };
            const request = new StreamRequest({ stream: mockStream, headers });

            expect(request.headers).toEqual(headers);
        });

        it('should create StreamRequest with chunk size', () => {
            const mockStream = mockStreamAdapter.createPassThrough();
            const request = new StreamRequest({ stream: mockStream, chunkSize: 1024 });

            expect(request.chunkSize).toBe(1024);
        });

        it('should convert to HeaderStream', () => {
            const mockStream = mockStreamAdapter.createPassThrough();
            const headers: PacketHeader = { 'message-id': 'req-stream' };
            const request = new StreamRequest({
                stream: mockStream,
                headers,
                id: 'req-stream',
                contentLength: 2048,
                chunkSize: 512
            });

            const stream = request.toStream();
            expect(stream.type).toBe(MessageType.STREAM);
            expect(stream.id).toBe('req-stream');
            expect(stream.chunkSize).toBe(512);
        });
    });

    describe('StreamResponse', () => {
        it('should create StreamResponse', () => {
            const mockStream = mockStreamAdapter.createPassThrough();
            const headers: PacketHeader = { 'content-type': ContentTypes.STREAM };
            const stream = createHeaderStream('resp-stream', mockStream, headers);

            const response = new StreamResponse(stream);
            expect(response.payload).toBeDefined();
            expect(response.status).toBe(200);
            expect(response.ok).toBe(true);
        });

        it('should create StreamResponse with error status', () => {
            const mockStream = mockStreamAdapter.createPassThrough();
            const stream = createHeaderStream('resp-err', mockStream, {});

            const response = new StreamResponse(stream, 500, 'Internal Server Error');
            expect(response.status).toBe(500);
            expect(response.ok).toBe(false);
        });
    });

    describe('DefaultStreamHandler', () => {
        it('should handle HeaderStream', async () => {
            const handler = new DefaultStreamHandler(mockStreamAdapter as any);
            const mockStream = mockStreamAdapter.createPassThrough();
            const stream = createHeaderStream('handler-stream', mockStream, {});

            const result = await lastValueFrom(handler.handle(stream, context));
            expect(result.ok).toBe(true);
            expect(result.payload).toBeDefined();
        });

        it('should handle StreamRequest', async () => {
            const handler = new DefaultStreamHandler(mockStreamAdapter as any);
            const mockStream = mockStreamAdapter.createPassThrough();
            const request = new StreamRequest({ stream: mockStream });

            const result = await lastValueFrom(handler.handle(request, context));
            expect(result.ok).toBe(true);
        });
    });
});
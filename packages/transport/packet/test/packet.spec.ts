import expect = require('expect');
import { Buffer } from 'buffer';
import { lastValueFrom, of } from 'rxjs';
import { PacketRequest, PacketResponse, DefaultPacketHandler } from '../src/handler';
import { HeaderPacketCodec, PACKET_CODEC_OPTIONS } from '../src/codec';
import { PacketInterceptor } from '../src/interceptor';
import { createHeaderPacket, MessageType, ContentTypes, PacketHeader } from '@tsdi/common';

describe('Packet Transport Tests', () => {

    const context = {
        get: (token: any) => {
            if (token === PACKET_CODEC_OPTIONS) {
                return { headerLengthSize: 4 };
            }
            return null;
        }
    } as any;

    describe('HeaderPacketCodec', () => {
        it('should support PACKET type', () => {
            const codec = new HeaderPacketCodec();
            expect(codec.supports(MessageType.PACKET)).toBe(true);
            expect(codec.supports(MessageType.TEXT)).toBe(false);
        });

        it('should encode HeaderPacket', () => {
            const codec = new HeaderPacketCodec();
            const headers: PacketHeader = {
                'content-type': ContentTypes.JSON,
                'message-id': 'test-123'
            };
            const packet = createHeaderPacket('test-123', { data: 'test' }, 0, headers);

            const encoded = codec.encode(packet, context);
            expect(Buffer.isBuffer(encoded)).toBe(true);
            expect(encoded.length).toBeGreaterThan(4);
        });

        it('should decode buffer to HeaderPacket', () => {
            const codec = new HeaderPacketCodec();
            const headers: PacketHeader = {
                'content-type': ContentTypes.JSON,
                'message-id': 'msg-456'
            };
            const packet = createHeaderPacket('msg-456', { key: 'value' }, 0, headers);

            const encoded = codec.encode(packet, context);
            const decoded = codec.decode(encoded, context);

            expect(decoded.type).toBe(MessageType.PACKET);
            expect(decoded.headers?.['message-id']).toBe('msg-456');
            expect(decoded.payload.key).toBe('value');
        });

        it('should handle binary payload', () => {
            const codec = new HeaderPacketCodec();
            const binaryData = Buffer.from([1, 2, 3, 4, 5]);
            const headers: PacketHeader = {
                'content-type': ContentTypes.OCTET_STREAM
            };
            const packet = createHeaderPacket('binary-msg', binaryData, binaryData.length, headers);

            const encoded = codec.encode(packet, context);
            const decoded = codec.decode(encoded, context);

            expect(Buffer.isBuffer(decoded.payload)).toBe(true);
        });

        it('should throw on invalid buffer', () => {
            const codec = new HeaderPacketCodec();
            const invalidBuffer = Buffer.from([0, 0]);

            expect(() => codec.decode(invalidBuffer, context)).toThrow();
        });
    });

    describe('PacketRequest', () => {
        it('should create PacketRequest with payload', () => {
            const payload = { name: 'test', value: 123 };
            const request = new PacketRequest({ payload });
            expect(request.payload).toEqual(payload);
        });

        it('should create PacketRequest with headers', () => {
            const payload = { data: 'value' };
            const headers: PacketHeader = { 'custom': 'header' };
            const request = new PacketRequest({ payload, headers });
            expect(request.headers).toEqual(headers);
        });

        it('should convert to HeaderPacket', () => {
            const payload = { key: 'value' };
            const headers: PacketHeader = { 'message-id': 'test-id' };
            const request = new PacketRequest({ payload, headers, id: 'test-id' });
            const packet = request.toPacket();

            expect(packet.type).toBe(MessageType.PACKET);
            expect(packet.headers?.['message-id']).toBe('test-id');
        });
    });

    describe('PacketResponse', () => {
        it('should create PacketResponse', () => {
            const payload = { result: 'success' };
            const headers: PacketHeader = { 'content-type': ContentTypes.JSON };
            const packet = createHeaderPacket('resp-1', payload, 0, headers);
            const response = new PacketResponse(packet);

            expect(response.payload).toEqual(payload);
            expect(response.status).toBe(200);
            expect(response.ok).toBe(true);
        });

        it('should create PacketResponse with error status', () => {
            const payload = { error: 'failed' };
            const packet = createHeaderPacket('resp-err', payload, 0, {});
            const response = new PacketResponse(packet, 500, 'Internal Server Error');

            expect(response.status).toBe(500);
            expect(response.ok).toBe(false);
        });
    });

    describe('DefaultPacketHandler', () => {
        it('should handle HeaderPacket', async () => {
            const handler = new DefaultPacketHandler();
            const payload = { handler: 'test' };
            const packet = createHeaderPacket('handler-1', payload, 0, {});

            const result = await lastValueFrom(handler.handle(packet, context));
            expect(result.payload).toEqual(payload);
            expect(result.ok).toBe(true);
        });

        it('should handle PacketRequest', async () => {
            const handler = new DefaultPacketHandler();
            const payload = { request: 'data' };
            const request = new PacketRequest({ payload });

            const result = await lastValueFrom(handler.handle(request, context));
            expect(result.payload).toEqual(payload);
        });
    });

    describe('PacketInterceptor', () => {
        it('should intercept and decode buffer', async () => {
            const codec = new HeaderPacketCodec();
            const interceptor = new PacketInterceptor(codec);
            const payload = { intercept: 'test' };
            const headers: PacketHeader = { 'message-id': 'intercept-1' };
            const packet = createHeaderPacket('intercept-1', payload, 0, headers);
            const input = codec.encode(packet, context);

            const result$ = interceptor.intercept(
                input,
                (p) => of(p),
                context
            );

            const result = await lastValueFrom(result$);
            expect(result.type).toBe(MessageType.PACKET);
            expect(result.payload).toEqual(payload);
        });
    });
});
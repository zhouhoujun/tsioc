import { Buffer } from 'buffer';
import expect = require('expect');
import { MessageType, createTextMessage, createJsonMessage, createHeaderPacket, ContentTypes } from '@tsdi/common';
import { TextCodec } from '../text.codec';
import { JsonCodec } from '../json.codec';
import { HeaderPacketCodec } from '../packet.codec';
import { HeaderStreamCodec } from '../stream.codec';

describe('Codecs Tests', () => {

    describe('TextCodec', () => {
        it('should support TEXT type', () => {
            const codec = new TextCodec();
            expect(codec.supports(MessageType.TEXT)).toBe(true);
            expect(codec.supports(MessageType.JSON)).toBe(false);
        });

        it('should encode string to buffer', () => {
            const codec = new TextCodec();
            const text = 'Hello World';
            const context = { get: () => ({ defaultEncoding: 'utf8' }) } as any;
            const encoded = codec.encode(text, context);
            expect(Buffer.isBuffer(encoded)).toBe(true);
            expect(encoded.toString('utf8')).toBe(text);
        });

        it('should decode buffer to TextMessage', () => {
            const codec = new TextCodec();
            const buffer = Buffer.from('Hello World', 'utf8');
            const context = { get: () => ({ defaultEncoding: 'utf8' }) } as any;
            const decoded = codec.decode(buffer, context);
            expect(decoded.type).toBe(MessageType.TEXT);
            expect(decoded.payload).toBe('Hello World');
        });

        it('should encode TextMessage', () => {
            const codec = new TextCodec();
            const message = createTextMessage('Test Message', 'utf8');
            const context = { get: () => ({ defaultEncoding: 'utf8' }) } as any;
            const encoded = codec.encode(message, context);
            expect(Buffer.isBuffer(encoded)).toBe(true);
            expect(encoded.toString('utf8')).toBe('Test Message');
        });
    });

    describe('JsonCodec', () => {
        it('should support JSON type', () => {
            const codec = new JsonCodec();
            expect(codec.supports(MessageType.JSON)).toBe(true);
            expect(codec.supports(MessageType.TEXT)).toBe(false);
        });

        it('should encode object to buffer', () => {
            const codec = new JsonCodec();
            const data = { name: 'test', value: 123 };
            const context = { get: () => ({}) } as any;
            const encoded = codec.encode(data, context);
            expect(Buffer.isBuffer(encoded)).toBe(true);
            const parsed = JSON.parse(encoded.toString('utf8'));
            expect(parsed.name).toBe('test');
            expect(parsed.value).toBe(123);
        });

        it('should decode buffer to JsonMessage', () => {
            const codec = new JsonCodec();
            const data = { key: 'value' };
            const buffer = Buffer.from(JSON.stringify(data), 'utf8');
            const context = { get: () => ({}) } as any;
            const decoded = codec.decode(buffer, context);
            expect(decoded.type).toBe(MessageType.JSON);
            expect((decoded.payload as any).key).toBe('value');
        });

        it('should handle empty JSON', () => {
            const codec = new JsonCodec();
            const buffer = Buffer.from('{}', 'utf8');
            const context = { get: () => ({}) } as any;
            const decoded = codec.decode(buffer, context);
            expect(decoded.payload).toEqual({});
        });
    });

    describe('HeaderPacketCodec', () => {
        it('should support PACKET type', () => {
            const codec = new HeaderPacketCodec();
            expect(codec.supports(MessageType.PACKET)).toBe(true);
        });

        it('should encode and decode HeaderPacket', () => {
            const codec = new HeaderPacketCodec();
            const context = { get: () => ({ headerLengthSize: 4 }) } as any;

            const packet = createHeaderPacket(
                'msg-123',
                { data: 'test' },
                0,
                { 'content-type': ContentTypes.JSON, 'message-id': 'msg-123' }
            );

            const encoded = codec.encode(packet, context);
            expect(Buffer.isBuffer(encoded)).toBe(true);
            expect(encoded.length > 4).toBe(true);

            const decoded = codec.decode(encoded, context);
            expect(decoded.type).toBe(MessageType.PACKET);
            expect(decoded.headers?.['message-id']).toBe('msg-123');
            expect(decoded.payload.data).toBe('test');
        });

        it('should handle binary payload', () => {
            const codec = new HeaderPacketCodec();
            const context = { get: () => ({ headerLengthSize: 4 }) } as any;

            const binaryData = Buffer.from([1, 2, 3, 4, 5]);
            const packet = createHeaderPacket(
                'binary-msg',
                binaryData,
                binaryData.length,
                { 'content-type': ContentTypes.OCTET_STREAM }
            );

            const encoded = codec.encode(packet, context);
            const decoded = codec.decode(encoded, context);
            expect(Buffer.isBuffer(decoded.payload)).toBe(true);
        });
    });

    describe('HeaderStreamCodec', () => {
        it('should support STREAM type', () => {
            const codec = new HeaderStreamCodec();
            expect(codec.supports(MessageType.STREAM)).toBe(true);
        });

        it('should create and parse chunk header', () => {
            const codec = new HeaderStreamCodec();

            const chunkHeader = codec.createChunkHeader(0, 1024, false);
            expect(chunkHeader.length).toBe(9);

            const parsed = codec.parseChunkHeader(chunkHeader);
            expect(parsed.chunkIndex).toBe(0);
            expect(parsed.chunkSize).toBe(1024);
            expect(parsed.isLast).toBe(false);
        });

        it('should create last chunk header', () => {
            const codec = new HeaderStreamCodec();

            const chunkHeader = codec.createChunkHeader(5, 512, true);
            const parsed = codec.parseChunkHeader(chunkHeader);

            expect(parsed.chunkIndex).toBe(5);
            expect(parsed.isLast).toBe(true);
        });
    });
});
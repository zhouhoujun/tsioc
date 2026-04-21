import { Injectable, ContextToken } from '@tsdi/ioc';
import { RequestContext, StreamAdapter, IReadable } from '@tsdi/common';
import { MessageType, HeaderStream, createHeaderStream, PacketHeader, ContentTypes } from '@tsdi/common';

/**
 * StreamCodecOptions
 */
export interface StreamCodecOptions {
    chunkSize?: number;
    maxSize?: number;
    sendEndMarker?: boolean;
    endMarker?: string | Buffer;
}

/**
 * ContextToken for StreamCodecOptions
 */
export const STREAM_CODEC_OPTIONS = new ContextToken<StreamCodecOptions>(() => ({ chunkSize: 64 * 1024 }));

/**
 * HeaderStream编码格式:
 * [header-length:4bytes][headers-json][chunk-size:4bytes][payload-stream]
 */

/**
 * HeaderStreamCodec - 带HTTP-like Headers的流数据编解码器
 */
@Injectable()
export class HeaderStreamCodec {

    supports(type: MessageType): boolean {
        return type === MessageType.STREAM;
    }

    /**
     * 编码 - 将HeaderStream转换为Buffer(header部分)
     * 流数据本身不在此处编码，而是返回header信息供后续流式发送
     */
    encode(input: HeaderStream, context: RequestContext): Buffer {
        const options = context.get(STREAM_CODEC_OPTIONS) ?? {} as StreamCodecOptions;

        // 构建headers，包含流信息
        const headers: PacketHeader = {
            ...input.headers,
            'content-type': ContentTypes.STREAM,
            'content-length': input.contentLength,
            ...(input.id ? { 'message-id': String(input.id) } : {})
        };

        // 序列化headers为JSON
        const headersJson = JSON.stringify(headers);
        const headersBuffer = Buffer.from(headersJson, 'utf8');

        // 添加chunk大小信息
        const chunkSize = input.chunkSize ?? options.chunkSize ?? 64 * 1024;
        const chunkSizeBuffer = Buffer.alloc(4);
        chunkSizeBuffer.writeUInt32BE(chunkSize, 0);

        // header长度字段
        const headerLengthBuffer = Buffer.alloc(4);
        headerLengthBuffer.writeUInt32BE(headersBuffer.length, 0);

        // 组合header部分(不含payload)
        return Buffer.concat([headerLengthBuffer, headersBuffer, chunkSizeBuffer]);
    }

    /**
     * 解码 - 将Buffer转换为HeaderStream
     */
    decode(input: Buffer, context: RequestContext): HeaderStream {
        const options = context.get(STREAM_CODEC_OPTIONS) ?? {} as StreamCodecOptions;
        const streamAdapter = context.get(StreamAdapter);

        if (input.length < 8) {
            throw new Error('Invalid stream packet: header fields missing');
        }

        if (options.maxSize && input.length > options.maxSize) {
            throw new Error(`Stream header exceeds maximum size: ${options.maxSize} bytes`);
        }

        // 读取header长度
        const headerLength = input.readUInt32BE(0);

        // 读取headers
        const headersStart = 4;
        const headersEnd = headersStart + headerLength;
        if (headersEnd > input.length) {
            throw new Error('Invalid stream packet: header length exceeds buffer size');
        }

        const headersBuffer = input.subarray(headersStart, headersEnd);
        const headers: PacketHeader = JSON.parse(headersBuffer.toString('utf8'));

        // 读取chunk大小
        const chunkSizeStart = headersEnd;
        const chunkSizeEnd = chunkSizeStart + 4;
        if (chunkSizeEnd > input.length) {
            throw new Error('Invalid stream packet: chunk size field missing');
        }

        const chunkSize = input.readUInt32BE(chunkSizeStart);

        // 如果有payload部分，创建流
        let stream: IReadable | undefined;
        if (input.length > chunkSizeEnd) {
            const payloadBuffer = input.subarray(chunkSizeEnd);
            const passThrough = streamAdapter.createPassThrough();
            passThrough.write(payloadBuffer);
            passThrough.end();
            stream = passThrough as IReadable;
        }

        // 创建HeaderStream
        return createHeaderStream(
            headers['message-id'] ?? '',
            stream ?? streamAdapter.createPassThrough() as IReadable,
            headers,
            headers['content-length'] as number,
            chunkSize
        );
    }

    /**
     * 创建流chunk header
     */
    createChunkHeader(chunkIndex: number, chunkSize: number, isLast: boolean): Buffer {
        const headerBuffer = Buffer.alloc(9);
        headerBuffer.writeUInt32BE(chunkIndex, 0);
        headerBuffer.writeUInt32BE(chunkSize, 4);
        headerBuffer.writeUInt8(isLast ? 1 : 0, 8);
        return headerBuffer;
    }

    /**
     * 解析流chunk header
     */
    parseChunkHeader(buffer: Buffer): { chunkIndex: number; chunkSize: number; isLast: boolean } {
        if (buffer.length < 9) {
            throw new Error('Invalid chunk header: insufficient length');
        }

        return {
            chunkIndex: buffer.readUInt32BE(0),
            chunkSize: buffer.readUInt32BE(4),
            isLast: buffer.readUInt8(8) === 1
        };
    }
}
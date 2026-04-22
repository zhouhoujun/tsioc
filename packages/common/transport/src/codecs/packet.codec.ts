import { Injectable } from '@tsdi/ioc';
import { MessageType, HeaderPacket, createHeaderPacket, PacketHeader, ContentTypes, RequestContext } from '@tsdi/common';
import { Codec, PACKET_CODEC_OPTIONS, PacketCodecOptions } from './codec';

/**
 * HeaderPacket编码格式:
 * [header-length:4bytes][headers-json][payload]
 */

/**
 * HeaderPacketCodec - 带HTTP-like Headers的数据包编解码器
 * 处理带元数据的完整数据包的序列化和反序列化
 */
@Injectable()
export class HeaderPacketCodec implements Codec {

    supports(type: MessageType): boolean {
        return type === MessageType.PACKET;
    }

    /**
     * 编码 - 将HeaderPacket转换为Buffer
     * @param input HeaderPacket对象
     * @param context 请求上下文
     * @returns 编码后的Buffer
     */
    encode(input: HeaderPacket, context: RequestContext): Buffer {
        const options = context.get(PACKET_CODEC_OPTIONS) ?? {} as PacketCodecOptions;
        const headerLengthSize = options.headerLengthSize ?? 4;

        // 序列化headers为JSON
        const headersJson = JSON.stringify(input.headers ?? {});
        const headersBuffer = Buffer.from(headersJson, 'utf8');

        // 序列化payload
        const payloadBuffer = this.encodePayload(input.payload, input.headers);

        // 计算header长度
        const headerLength = headersBuffer.length;

        // 构建header长度字段
        const headerLengthBuffer = Buffer.alloc(headerLengthSize);
        if (headerLengthSize === 4) {
            headerLengthBuffer.writeUInt32BE(headerLength, 0);
        } else if (headerLengthSize === 2) {
            headerLengthBuffer.writeUInt16BE(headerLength, 0);
        } else {
            // 自定义长度
            headerLengthBuffer.writeUIntBE(headerLength, 0, headerLengthSize);
        }

        // 组合所有部分
        return Buffer.concat([headerLengthBuffer, headersBuffer, payloadBuffer]);
    }

    /**
     * 解码 - 将Buffer转换为HeaderPacket
     * @param input Buffer数据
     * @param context 请求上下文
     * @returns 解码后的HeaderPacket
     */
    decode(input: Buffer, context: RequestContext): HeaderPacket {
        const options = context.get(PACKET_CODEC_OPTIONS) ?? {} as PacketCodecOptions;
        const headerLengthSize = options.headerLengthSize ?? 4;

        // 检查最小长度
        if (input.length < headerLengthSize) {
            throw new Error('Invalid packet: header length field missing');
        }

        // 检查最大大小限制
        if (options.maxSize && input.length > options.maxSize) {
            throw new Error(`Packet exceeds maximum size: ${options.maxSize} bytes`);
        }

        // 读取header长度
        let headerLength: number;
        if (headerLengthSize === 4) {
            headerLength = input.readUInt32BE(0);
        } else if (headerLengthSize === 2) {
            headerLength = input.readUInt16BE(0);
        } else {
            headerLength = input.readUIntBE(0, headerLengthSize);
        }

        // 检查header长度有效性
        const headersStart = headerLengthSize;
        const headersEnd = headersStart + headerLength;
        if (headersEnd > input.length) {
            throw new Error('Invalid packet: header length exceeds buffer size');
        }

        // 解析headers
        const headersBuffer = input.subarray(headersStart, headersEnd);
        const headers: PacketHeader = JSON.parse(headersBuffer.toString('utf8'));

        // 解析payload
        const payloadBuffer = input.subarray(headersEnd);
        const payload = this.decodePayload(payloadBuffer, headers);

        // 创建HeaderPacket
        return createHeaderPacket(
            headers['message-id'] ?? '',
            payload,
            payloadBuffer.length,
            headers
        );
    }

    /**
     * 编码payload
     * @param payload payload数据
     * @param headers headers信息
     * @returns Buffer
     */
    protected encodePayload(payload: any, headers?: PacketHeader): Buffer {
        const contentType = headers?.['content-type'] ?? ContentTypes.JSON;

        if (Buffer.isBuffer(payload)) {
            return payload;
        }

        if (typeof payload === 'string') {
            return Buffer.from(payload, 'utf8');
        }

        // 默认JSON编码
        return Buffer.from(JSON.stringify(payload), 'utf8');
    }

    /**
     * 解码payload
     * @param buffer Buffer数据
     * @param headers headers信息
     * @returns 解码后的数据
     */
    protected decodePayload(buffer: Buffer, headers?: PacketHeader): any {
        const contentType = headers?.['content-type'] ?? ContentTypes.JSON;

        if (contentType === ContentTypes.OCTET_STREAM) {
            return buffer;
        }

        if (contentType === ContentTypes.TEXT_PLAIN || contentType === ContentTypes.TEXT_HTML) {
            return buffer.toString('utf8');
        }

        // 默认JSON解码
        if (buffer.length === 0) {
            return null;
        }

        try {
            return JSON.parse(buffer.toString('utf8'));
        } catch {
            // 如果JSON解析失败，返回原始buffer
            return buffer;
        }
    }
}
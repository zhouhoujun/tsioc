import { Abstract } from '@tsdi/ioc';
import { RequestContext, MessageType } from '@tsdi/common';



/**
 * Codec接口 - 编解码器抽象
 * 用于处理不同类型数据的序列化和反序列化
 */
export interface Codec {
    /**
     * 编码 - 将数据转换为Buffer
     * @param input 输入数据
     * @param context 请求上下文
     * @returns 编码后的Buffer
     */
    encode(input: any, context: RequestContext): Buffer | Promise<Buffer>;

    /**
     * 解码 - 将Buffer转换为数据
     * @param input Buffer数据
     * @param context 请求上下文
     * @returns 解码后的数据
     */
    decode(input: Buffer, context: RequestContext): any | Promise<any>;

    /**
     * 是否支持指定消息类型
     * @param type 消息类型
     * @returns 是否支持
     */
    supports(type: MessageType): boolean;
}

/**
 * Codec抽象基类
 */
@Abstract()
export abstract class AbstractCodec implements Codec {

    abstract encode(input: any, context: RequestContext): Buffer | Promise<Buffer>;
    abstract decode(input: Buffer, context: RequestContext): any | Promise<any>;
    abstract supports(type: MessageType): boolean;
}

/**
 * 编解码器选项接口
 */
export interface CodecOptions {
    /**
     * 编码格式
     */
    encoding?: BufferEncoding;

    /**
     * 最大处理大小
     */
    maxSize?: number;

    /**
     * 是否严格模式
     */
    strict?: boolean;
}

/**
 * 文本编解码器选项
 */
export interface TextCodecOptions extends CodecOptions {
    /**
     * 默认编码格式
     */
    defaultEncoding?: BufferEncoding;
}

/**
 * JSON编解码器选项
 */
export interface JsonCodecOptions extends CodecOptions {
    /**
     * JSON解析时的reviver函数
     */
    reviver?: (this: any, key: string, value: any) => any;

    /**
     * JSON序列化时的replacer函数
     */
    replacer?: (this: any, key: string, value: any) => any;

    /**
     * JSON序列化时的缩进空格数
     */
    spaces?: number | string;
}

/**
 * HeaderPacket编解码器选项
 */
export interface PacketCodecOptions extends CodecOptions {
    /**
     * 头部长度字段大小(字节)，默认4字节
     */
    headerLengthSize?: number;

    /**
     * 是否包含消息ID
     */
    includeMessageId?: boolean;

    /**
     * 消息ID长度(字节)，默认2字节
     */
    messageIdSize?: number;
}

/**
 * HeaderStream编解码器选项
 */
export interface StreamCodecOptions extends CodecOptions {
    /**
     * 分块大小
     */
    chunkSize?: number;

    /**
     * 是否发送结束标记
     */
    sendEndMarker?: boolean;

    /**
     * 结束标记
     */
    endMarker?: string | Buffer;
}

/**
 * ContextToken用于存储Codec选项
 */
import { ContextToken } from '@tsdi/ioc';

export const TEXT_CODEC_OPTIONS = new ContextToken<TextCodecOptions>(() => ({ defaultEncoding: 'utf8' }));
export const JSON_CODEC_OPTIONS = new ContextToken<JsonCodecOptions>(() => ({ spaces: 0 }));
export const PACKET_CODEC_OPTIONS = new ContextToken<PacketCodecOptions>(() => ({ headerLengthSize: 4 }));
export const STREAM_CODEC_OPTIONS = new ContextToken<StreamCodecOptions>(() => ({ chunkSize: 64 * 1024 }));

export * from './text.codec';
export * from './json.codec';
export * from './packet.codec';
export * from './stream.codec';
import { IReadable } from './stream';

/**
 * 消息类型枚举
 */
export enum MessageType {
    TEXT = 'text',
    JSON = 'json',
    PACKET = 'packet',
    STREAM = 'stream'
}

/**
 * 基础消息接口 - 所有数据类型的基类
 */
export interface Message<T = any> {
    /**
     * 消息类型
     */
    type: MessageType;
    /**
     * 消息载荷
     */
    payload: T;
    /**
     * 消息头
     */
    headers?: PacketHeader;
}

/**
 * Text消息 - 简单文本数据
 */
export interface TextMessage extends Message<string> {
    type: MessageType.TEXT;
    /**
     * 文本编码格式
     */
    encoding?: BufferEncoding;
}

/**
 * JSON消息 - 结构化数据
 */
export interface JsonMessage<T = object> extends Message<T> {
    type: MessageType.JSON;
    /**
     * JSON解析时的reviver函数
     */
    reviver?: (this: any, key: string, value: any) => any;
    /**
     * JSON序列化时的replacer函数
     */
    replacer?: (this: any, key: string, value: any) => any;
}

/**
 * HeaderPacket消息 - 带头的完整数据包
 * 适用于请求-响应模式、带元数据的消息传输
 */
export interface HeaderPacket<T = any> extends Message<T> {
    type: MessageType.PACKET;
    /**
     * 消息唯一标识
     */
    id?: string | number;
    /**
     * payload长度
     */
    contentLength: number;
    /**
     * 是否完整包
     */
    complete: boolean;
}

/**
 * HeaderStream消息 - 带头的流数据
 * 适用于大文件传输、视频流、实时数据流
 */
export interface HeaderStream extends Message<IReadable> {
    type: MessageType.STREAM;
    /**
     * 消息唯一标识
     */
    id: string | number;
    /**
     * payload长度，流可能无固定长度
     */
    contentLength?: number;
    /**
     * 分块大小
     */
    chunkSize?: number;
}

/**
 * PacketHeader - HTTP-like Headers格式
 * 支持标准字段和自定义扩展
 */
export interface PacketHeader {
    // 标准字段
    /**
     * 内容类型: application/json, text/plain, application/octet-stream
     */
    'content-type'?: string;
    /**
     * payload长度
     */
    'content-length'?: number;
    /**
     * 内容编码: gzip, deflate, identity
     */
    'content-encoding'?: string;

    // 消息标识
    /**
     * 消息唯一ID
     */
    'message-id'?: string;
    /**
     * 关联ID (请求-响应模式)
     */
    'correlation-id'?: string;
    /**
     * 回复主题
     */
    'reply-to'?: string;

    // 协议扩展
    /**
     * 协议版本
     */
    'protocol-version'?: string;
    /**
     * 时间戳
     */
    'timestamp'?: number;

    // 自定义扩展 - 支持任意自定义header
    [key: string]: string | number | undefined;
}

/**
 * 标准Content-Type常量
 */
export const ContentTypes = {
    JSON: 'application/json',
    JSON_UTF8: 'application/json; charset=utf-8',
    TEXT_PLAIN: 'text/plain',
    TEXT_HTML: 'text/html',
    OCTET_STREAM: 'application/octet-stream',
    XML: 'application/xml',
    FORM: 'application/x-www-form-urlencoded',
    MULTIPART_FORM: 'multipart/form-data',
    STREAM: 'application/stream'
};

/**
 * 标准Content-Encoding常量
 */
export const ContentEncodings = {
    GZIP: 'gzip',
    DEFLATE: 'deflate',
    IDENTITY: 'identity',
    BR: 'br'
};

/**
 * HeaderPacket编码格式:
 * [header-length:4bytes][headers-json][payload]
 * Header部分使用JSON编码，支持任意key-value
 */

/**
 * 创建TextMessage的工厂函数
 */
export function createTextMessage(text: string, encoding?: BufferEncoding, headers?: PacketHeader): TextMessage {
    return {
        type: MessageType.TEXT,
        payload: text,
        encoding,
        headers
    };
}

/**
 * 创建JsonMessage的工厂函数
 */
export function createJsonMessage<T extends object>(data: T, headers?: PacketHeader): JsonMessage<T> {
    return {
        type: MessageType.JSON,
        payload: data,
        headers
    };
}

/**
 * 创建HeaderPacket的工厂函数
 */
export function createHeaderPacket<T>(id: string | number, payload: T, contentLength: number, headers?: PacketHeader): HeaderPacket<T> {
    return {
        type: MessageType.PACKET,
        id,
        payload,
        contentLength,
        complete: true,
        headers
    };
}

/**
 * 创建HeaderStream的工厂函数
 */
export function createHeaderStream(id: string | number, stream: IReadable, headers?: PacketHeader, contentLength?: number, chunkSize?: number): HeaderStream {
    return {
        type: MessageType.STREAM,
        id,
        payload: stream,
        contentLength,
        chunkSize,
        headers
    };
}
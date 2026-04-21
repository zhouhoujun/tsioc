import { Injectable } from '@tsdi/ioc';
import { InvalidJsonException } from '@tsdi/core';
import { RequestContext } from '../context';
import { MessageType, JsonMessage, createJsonMessage, ContentTypes } from '../message';
import { Codec, JSON_CODEC_OPTIONS, JsonCodecOptions } from './index';

const strictJSONReg = /^[\x20\x09\x0a\x0d]*(\[|\{)/;

/**
 * JsonCodec - JSON编解码器
 * 处理结构化JSON数据的序列化和反序列化
 */
@Injectable()
export class JsonCodec implements Codec {

    supports(type: MessageType): boolean {
        return type === MessageType.JSON;
    }

    /**
     * 编码 - 将JSON对象转换为Buffer
     * @param input JSON对象或JsonMessage
     * @param context 请求上下文
     * @returns 编码后的Buffer
     */
    encode(input: object | JsonMessage, context: RequestContext): Buffer {
        const options = context.get(JSON_CODEC_OPTIONS) ?? {} as JsonCodecOptions;

        // 如果已经是JsonMessage，提取payload
        const data = this.isJsonMessage(input) ? input.payload : input;

        // 序列化为JSON字符串
        const jsonStr = JSON.stringify(
            data,
            options.replacer ?? (this.isJsonMessage(input) ? input.replacer : undefined),
            options.spaces
        );

        // 检查最大大小限制
        if (options.maxSize && Buffer.byteLength(jsonStr, 'utf8') > options.maxSize) {
            throw new Error(`JSON payload exceeds maximum size: ${options.maxSize} bytes`);
        }

        return Buffer.from(jsonStr, 'utf8');
    }

    /**
     * 解码 - 将Buffer转换为JsonMessage
     * @param input Buffer数据
     * @param context 请求上下文
     * @returns 解码后的JsonMessage
     */
    decode(input: Buffer, context: RequestContext): JsonMessage {
        const options = context.get(JSON_CODEC_OPTIONS) ?? {} as JsonCodecOptions;

        // 转换为字符串
        const jsonStr = input.toString('utf8');

        // 检查最大大小限制
        if (options.maxSize && jsonStr.length > options.maxSize) {
            throw new Error(`JSON payload exceeds maximum size: ${options.maxSize} bytes`);
        }

        // 解析JSON
        try {
            const data = this.parseJson(jsonStr, options);
            const message = createJsonMessage(data);

            // 设置reviver和replacer以便后续使用
            if (options.reviver) {
                message.reviver = options.reviver;
            }
            if (options.replacer) {
                message.replacer = options.replacer;
            }

            return message;
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }

    /**
     * 解析JSON字符串
     * @param jsonStr JSON字符串
     * @param options 解析选项
     * @returns 解析后的对象
     */
    protected parseJson(jsonStr: string, options: JsonCodecOptions): object {
        if (!jsonStr) {
            if (options.strict) {
                return {};
            }
            return {};
        }

        // 严格模式检查
        if (options.strict && !strictJSONReg.test(jsonStr)) {
            throw new Error('Invalid JSON: strict mode only supports object and array');
        }

        return JSON.parse(jsonStr, options.reviver);
    }

    /**
     * 判断是否为JsonMessage
     * @param input 输入数据
     * @returns 是否为JsonMessage
     */
    protected isJsonMessage(input: any): input is JsonMessage {
        return input && input.type === MessageType.JSON && 'payload' in input;
    }

    /**
     * 获取Content-Type
     * @param options 编解码器选项
     * @returns Content-Type字符串
     */
    getContentType(options?: JsonCodecOptions): string {
        if (options?.spaces) {
            return ContentTypes.JSON_UTF8;
        }
        return ContentTypes.JSON;
    }
}
import { Injectable } from '@tsdi/ioc';
import { RequestContext } from '../context';
import { MessageType, TextMessage, createTextMessage } from '../message';
import { Codec, TEXT_CODEC_OPTIONS, TextCodecOptions } from './index';

/**
 * TextCodec - 文本编解码器
 * 处理纯文本数据的序列化和反序列化
 */
@Injectable()
export class TextCodec implements Codec {

    supports(type: MessageType): boolean {
        return type === MessageType.TEXT;
    }

    /**
     * 编码 - 将文本字符串转换为Buffer
     * @param input 文本字符串或TextMessage
     * @param context 请求上下文
     * @returns 编码后的Buffer
     */
    encode(input: string | TextMessage, context: RequestContext): Buffer {
        const options = context.get(TEXT_CODEC_OPTIONS) ?? {} as TextCodecOptions;
        const encoding = this.getEncoding(input, options);

        // 如果已经是TextMessage，提取payload
        const text = typeof input === 'string' ? input : input.payload;

        // 检查最大大小限制
        if (options.maxSize && Buffer.byteLength(text, encoding) > options.maxSize) {
            throw new Error(`Text payload exceeds maximum size: ${options.maxSize} bytes`);
        }

        return Buffer.from(text, encoding);
    }

    /**
     * 解码 - 将Buffer转换为TextMessage
     * @param input Buffer数据
     * @param context 请求上下文
     * @returns 解码后的TextMessage
     */
    decode(input: Buffer, context: RequestContext): TextMessage {
        const options = context.get(TEXT_CODEC_OPTIONS) ?? {} as TextCodecOptions;
        const encoding = options.defaultEncoding ?? 'utf8';

        // 检查最大大小限制
        if (options.maxSize && input.length > options.maxSize) {
            throw new Error(`Text payload exceeds maximum size: ${options.maxSize} bytes`);
        }

        const text = input.toString(encoding);
        return createTextMessage(text, encoding);
    }

    /**
     * 获取编码格式
     * @param input 输入数据
     * @param options 编解码器选项
     * @returns 编码格式
     */
    protected getEncoding(input: string | TextMessage, options: TextCodecOptions): BufferEncoding {
        if (typeof input !== 'string' && input.encoding) {
            return input.encoding;
        }
        return options.defaultEncoding ?? 'utf8';
    }
}
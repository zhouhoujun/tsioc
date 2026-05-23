import { Abstract } from '@tsdi/ioc';
import { RequestContext, Incoming, ReadableLike, StreamAdapter, MimeAdapter } from '@tsdi/common';

/**
 * Body parser strategy interface.
 * Defines how request bodies are parsed for different protocols.
 * 请求体解析策略接口，定义不同协议的请求体解析方式
 */
@Abstract()
export abstract class IBodyparserStrategy {

    /**
     * Parse incoming request body.
     * 解析传入的请求体
     * @param input - Incoming request
     * @param context - RequestContext for adapters
     * @returns Parsed body result with raw and processed body
     */
    abstract parse(
        input: ReadableLike<Incoming>, 
        context: RequestContext
    ): Promise<{ raw?: any; body?: any }>;

    /**
     * Check if this parser can handle the incoming content type.
     * 检查此解析器是否可以处理传入的内容类型
     * @param contentType - Content type string
     * @param mimeAdapter - Mime adapter for matching
     */
    abstract canParse(contentType: string, mimeAdapter?: MimeAdapter): boolean;

    /**
     * Get supported content types.
     * 获取支持的内容类型
     */
    abstract getSupportedContentTypes(): string[];
}

/**
 * Bodyparser strategy token.
 * 请求体解析策略令牌
 */
export const BODYPARSER_STRATEGY = 'BODYPARSER_STRATEGY';
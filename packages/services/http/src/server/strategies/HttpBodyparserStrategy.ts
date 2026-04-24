import { Injectable } from '@tsdi/ioc';
import { RequestContext, Incoming, ReadableLike, MimeAdapter } from '@tsdi/common';
import { IBodyparserStrategy, BODYPARSER_STRATEGY } from '@tsdi/endpoints';

/**
 * HTTP body parser strategy.
 * HTTP 请求体解析策略，实现 IBodyparserStrategy 接口
 * Handles parsing of HTTP request bodies for various content types.
 */
@Injectable()
export class HttpBodyparserStrategy implements IBodyparserStrategy {

    private readonly supportedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain',
        'text/html',
        'application/octet-stream'
    ];

    /**
     * Parse incoming HTTP request body.
     * 解析传入的HTTP请求体
     */
    async parse(
        input: ReadableLike<Incoming>,
        context: RequestContext
    ): Promise<{ raw?: any; body?: any }> {
        const request = input as any;
        
        // HTTP requests often have pre-parsed body from middleware
        if (request.body !== undefined) {
            return { raw: request.rawBody ?? request.body, body: request.body };
        }

        // If no pre-parsed body, return empty
        // Actual parsing would be done by body-parser middleware in HTTP layer
        return { raw: null, body: null };
    }

    /**
     * Check if this parser can handle the incoming content type.
     * 检查此解析器是否可以处理传入的内容类型
     */
    canParse(contentType: string, mimeAdapter?: MimeAdapter): boolean {
        const normalized = mimeAdapter?.normalize(contentType) ?? contentType;
        return this.supportedTypes.some(type => 
            normalized.includes(type) || type.includes(normalized)
        );
    }

    /**
     * Get supported content types.
     * 获取支持的内容类型
     */
    getSupportedContentTypes(): string[] {
        return this.supportedTypes;
    }
}

/** Token export for DI */
export const HttpBodyparserStrategyToken = BODYPARSER_STRATEGY;
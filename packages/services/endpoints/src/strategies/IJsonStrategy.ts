import { Abstract } from '@tsdi/ioc';
import { RequestContext, StreamAdapter, ContentType } from '@tsdi/common';

/**
 * JSON strategy interface.
 * Defines how responses are serialized to JSON for different protocols.
 * JSON策略接口，定义不同协议的响应JSON序列化方式
 */
@Abstract()
export abstract class IJsonStrategy {

    /**
     * Stringify response data to JSON.
     * 将响应数据序列化为JSON
     * @param data - Data to stringify
     * @param context - RequestContext for adapters
     * @returns JSON string or stream
     */
    abstract stringifyResponse(
        data: any, 
        context: RequestContext
    ): string | any;

    /**
     * Check if response should be JSON.
     * 检查响应是否应为JSON
     * @param data - Response data
     * @param context - RequestContext for accepts check
     */
    abstract shouldJsonify(data: any, context: RequestContext): boolean;

    /**
     * Get content type for JSON response.
     * 获取JSON响应的内容类型
     */
    abstract getJsonContentType(): string;
}

/**
 * JSON strategy token.
 * JSON策略令牌
 */
export const JSON_STRATEGY = 'JSON_STRATEGY';
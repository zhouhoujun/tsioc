import { Injectable } from '@tsdi/ioc';
import { AbstractRequestContext } from '@tsdi/common';
import { IJsonStrategy, JSON_STRATEGY } from '@tsdi/endpoints';

/**
 * HTTP JSON strategy.
 * HTTP JSON策略，实现 IJsonStrategy 接口
 * Handles JSON serialization and parsing for HTTP.
 */
@Injectable()
export class HttpJsonStrategy implements IJsonStrategy {

    /**
     * Serialize value to JSON string.
     * 将值序列化为JSON字符串
     */
    serialize(value: any, context: AbstractRequestContext): string {
        return JSON.stringify(value);
    }

    /**
     * Parse JSON string to value.
     * 将JSON字符串解析为值
     */
    parse(text: string, context: AbstractRequestContext): any {
        return JSON.parse(text);
    }

    /**
     * Check if content type is JSON.
     * 检查内容类型是否为JSON
     */
    isJsonContentType(contentType: string): boolean {
        return contentType.includes('application/json');
    }

    /**
     * Get JSON content type header.
     * 获取JSON内容类型头
     */
    getJsonContentType(): string {
        return 'application/json; charset=utf-8';
    }
}

export const HttpJsonStrategyToken = JSON_STRATEGY;
import { Injectable } from '@tsdi/ioc';
import { AbstractRequestContext } from '@tsdi/common';
import { ILoggerStrategy, LOGGER_STRATEGY } from '@tsdi/endpoints';
import { Logger } from '@tsdi/logger';

/**
 * HTTP logger strategy.
 * HTTP 日志策略，实现 ILoggerStrategy 接口
 * Handles HTTP request/response logging.
 */
@Injectable()
export class HttpLoggerStrategy implements ILoggerStrategy {

    /**
     * Log request.
     * 记录请求日志
     */
    logRequest(logger: Logger, context: AbstractRequestContext): void {
        const request = context.request as any;
        logger.info(
            `[HTTP] ${request.method ?? 'GET'} ${context.url} - ${request.headers?.['user-agent'] ?? 'unknown'}`
        );
    }

    /**
     * Log response.
     * 记录响应日志
     */
    logResponse(logger: Logger, context: AbstractRequestContext): void {
        const response = context.response as any;
        logger.info(
            `[HTTP] ${context.url} - Status: ${response.statusCode ?? context.status} - ${context.length ?? 0} bytes`
        );
    }

    /**
     * Log error.
     * 记录错误日志
     */
    logError(logger: Logger, context: AbstractRequestContext, error: Error): void {
        logger.error(
            `[HTTP] ${context.url} - Error: ${error.message}`,
            error
        );
    }

    /**
     * Get log format type.
     * 获取日志格式类型
     */
    getLogFormat(): string {
        return 'http';
    }
}

export const HttpLoggerStrategyToken = LOGGER_STRATEGY;
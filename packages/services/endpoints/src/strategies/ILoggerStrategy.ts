import { Abstract } from '@tsdi/ioc';
import { Incoming, Outgoing, RequestContext, StatusAdapter } from '@tsdi/common';
import { Logger } from '@tsdi/logger';

/**
 * Logger strategy interface.
 * Defines how requests and responses are logged for different protocols.
 * 日志策略接口，定义不同协议的请求和响应日志记录方式
 */
@Abstract()
export abstract class ILoggerStrategy {

    /**
     * Log incoming request.
     * 记录传入请求
     * @param request - Incoming request
     * @param context - RequestContext
     * @param logger - Logger instance
     */
    abstract logRequest(
        request: Incoming, 
        context: RequestContext, 
        logger: Logger
    ): void;

    /**
     * Log outgoing response.
     * 记录传出响应
     * @param response - Outgoing response
     * @param context - RequestContext
     * @param logger - Logger instance
     * @param startTime - Start time for duration calculation
     */
    abstract logResponse(
        response: Outgoing, 
        context: RequestContext, 
        logger: Logger,
        startTime?: [number, number]
    ): void;

    /**
     * Log error.
     * 记录错误
     * @param error - Error instance
     * @param context - RequestContext
     * @param logger - Logger instance
     */
    abstract logError(
        error: Error, 
        context: RequestContext, 
        logger: Logger
    ): void;

    /**
     * Format status for logging.
     * 格式化状态用于日志
     * @param statusAdapter - Status adapter
     * @param statusCode - Status code
     * @param withColor - Whether to use color
     */
    abstract formatStatus(
        statusAdapter: StatusAdapter, 
        statusCode: number | string, 
        withColor: boolean
    ): string;
}

/**
 * Logger strategy token.
 * 日志策略令牌
 */
export const LOGGER_STRATEGY = 'LOGGER_STRATEGY';
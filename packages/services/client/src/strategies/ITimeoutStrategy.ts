import { Abstract } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';

/**
 * Timeout strategy interface.
 * Defines timeout handling for different protocols.
 * 超时策略接口，定义不同协议的超时处理方式
 */
@Abstract()
export abstract class ITimeoutStrategy {

    /**
     * Get the timeout duration in milliseconds.
     * 获取超时时间（毫秒）
     */
    abstract getTimeout(): number;

    /**
     * Handle timeout error.
     * 处理超时错误
     * @param error - The timeout error
     * @param context - RequestContext
     * @returns Processed error
     */
    abstract handleTimeout(error: Error, context: RequestContext): Error;

    /**
     * Check if timeout should be applied for this request.
     * 检查是否应该对此请求应用超时
     * @param context - RequestContext
     */
    abstract shouldApplyTimeout(context: RequestContext): boolean;

    /**
     * Create timeout error.
     * 创建超时错误
     * @param timeout - Timeout duration
     */
    abstract createTimeoutError(timeout: number): Error;
}

/**
 * Timeout strategy token.
 * 时策略令牌
 */
export const TIMEOUT_STRATEGY = 'TIMEOUT_STRATEGY';

/**
 * Default timeout in milliseconds.
 * 默认超时时间（毫秒）
 */
export const DEFAULT_TIMEOUT = 15000;
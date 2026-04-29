/**
 * Retry options, like Spring Cloud Retry.
 * 重试选项，类似 Spring Cloud Retry
 */
export interface RetryOptions {
    /**
     * max retry attempts.
     * 最大重试次数
     */
    maxAttempts?: number;
    /**
     * wait duration between retries in milliseconds.
     * 重试间隔等待时间（毫秒）
     */
    waitDuration?: number;
    /**
     * retry on which exceptions.
     * 对哪些异常进行重试
     */
    retryOnExceptions?: (new (...args: any[]) => Error)[];
    /**
     * exponential backoff multiplier.
     * 指数退避乘数
     */
    backoffMultiplier?: number;
}

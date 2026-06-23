import { Abstract } from '@tsdi/ioc';

/**
 * Circuit breaker strategy.
 * 断路器策略接口
 */
@Abstract()
export abstract class CircuitBreakerStrategy {
    /**
     * Check if circuit is open.
     * 检查断路器是否打开
     */
    abstract isOpen(): boolean;

    /**
     * Get error when circuit is open.
     * 获取断路器打开时的错误
     */
    abstract getOpenError(): Error;

    /**
     * Record success.
     * 记录成功
     */
    abstract recordSuccess(): void;

    /**
     * Record failure.
     * 记录失败
     */
    abstract recordFailure(): void;
}

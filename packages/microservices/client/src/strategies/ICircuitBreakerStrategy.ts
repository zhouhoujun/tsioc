import { token } from '@tsdi/ioc';

/**
 * Circuit breaker strategy interface.
 * 断路器策略接口
 */
export interface ICircuitBreakerStrategy {
    /**
     * Check if circuit is open.
     * 检查断路器是否打开
     */
    isOpen(): boolean;

    /**
     * Get error when circuit is open.
     * 获取断路器打开时的错误
     */
    getOpenError(): Error;

    /**
     * Record success.
     * 记录成功
     */
    recordSuccess(): void;

    /**
     * Record failure.
     * 记录失败
     */
    recordFailure(): void;
}

export const CIRCUIT_BREAKER_STRATEGY = token<ICircuitBreakerStrategy>('CIRCUIT_BREAKER_STRATEGY');

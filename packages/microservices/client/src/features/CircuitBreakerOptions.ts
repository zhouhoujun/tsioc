/**
 * Circuit breaker options, like Spring Cloud Resilience4j.
 * 断路器选项，类似 Spring Cloud Resilience4j
 */
export interface CircuitBreakerOptions {
    /**
     * failure rate threshold (0-1) to open circuit.
     * 打开断路器的失败率阈值（0-1）
     */
    failureRateThreshold?: number;
    /**
     * slow call rate threshold (0-1).
     * 慢调用率阈值（0-1）
     */
    slowCallRateThreshold?: number;
    /**
     * wait duration in open state in milliseconds.
     * 断路器打开状态等待时间（毫秒）
     */
    waitDurationInOpenState?: number;
    /**
     * permitted number of calls in half-open state.
     * 半开状态允许的调用数量
     */
    permittedNumberOfCallsInHalfOpenState?: number;
    /**
     * sliding window size.
     * 滑动窗口大小
     */
    slidingWindowSize?: number;
    /**
     * slow call duration threshold in milliseconds.
     * 慢调用持续时间阈值（毫秒）
     */
    slowCallDurationThreshold?: number;
}

/**
 * Graceful shutdown options, like Spring Cloud graceful shutdown.
 * 优雅关闭选项，类似 Spring Cloud 优雅关闭
 */
export interface GracefulShutdownOptions {
    /**
     * enable graceful shutdown or not. default true.
     * 是否启用优雅关闭，默认 true
     */
    enabled?: boolean;
    /**
     * timeout in milliseconds to wait for in-flight requests. default 30000.
     * 等待进行中请求的超时时间（毫秒），默认 30000
     */
    timeout?: number;
    /**
     * wait duration before starting shutdown in milliseconds. default 5000.
     * 开始关闭前的等待时间（毫秒），默认 5000
     */
    waitDuration?: number;
    /**
     * deregister before shutdown or not. default true.
     * 关闭前是否注销，默认 true
     */
    deregisterBeforeShutdown?: boolean;
}

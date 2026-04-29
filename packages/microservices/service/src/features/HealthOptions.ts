import { Type } from '@tsdi/ioc';

/**
 * Health check options, like Spring Cloud Health Actuator.
 * 健康检查选项，类似 Spring Cloud Health Actuator
 */
export interface HealthOptions {
    /**
     * enable health endpoint or not. default true.
     * 是否启用健康端点，默认 true
     */
    enabled?: boolean;
    /**
     * health check path. default '/health'.
     * 健康检查路径，默认 '/health'
     */
    path?: string;
    /**
     * health check interval in milliseconds.
     * 健康检查间隔（毫秒）
     */
    checkInterval?: number;
    /**
     * custom health indicators.
     * 自定义健康指示器
     */
    indicators?: Type[];
}

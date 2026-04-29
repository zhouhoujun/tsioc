import { token } from '@tsdi/ioc';

/**
 * Health check strategy interface.
 * 健康检查策略接口
 */
export interface IHealthCheckStrategy {
    /**
     * Start health checks.
     * 启动健康检查
     */
    start(): Promise<void>;

    /**
     * Stop health checks.
     * 停止健康检查
     */
    stop(): Promise<void>;
}

export const HEALTH_CHECK_STRATEGY = token<IHealthCheckStrategy>('HEALTH_CHECK_STRATEGY');

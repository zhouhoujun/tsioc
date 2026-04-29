import { token } from '@tsdi/ioc';

/**
 * Graceful shutdown strategy interface.
 * 优雅关闭策略接口
 */
export interface IGracefulShutdownStrategy {
    /**
     * Perform graceful shutdown.
     * 执行优雅关闭
     */
    shutdown(): Promise<void>;
}

export const GRACEFUL_SHUTDOWN_STRATEGY = token<IGracefulShutdownStrategy>('GRACEFUL_SHUTDOWN_STRATEGY');

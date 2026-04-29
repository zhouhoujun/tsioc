import { Observable } from 'rxjs';
import { Token, token } from '@tsdi/ioc';

/**
 * Client discovery strategy interface.
 * 客户端服务发现策略接口
 */
export interface IClientDiscoveryStrategy {
    /**
     * Discover service instances.
     * 发现服务实例
     */
    discover(): Promise<any> | Observable<any>;

    /**
     * Shutdown discovery.
     * 关闭发现
     */
    onShutdown(): Promise<void>;
}

export const CLIENT_DISCOVERY_STRATEGY = token<IClientDiscoveryStrategy>('CLIENT_DISCOVERY_STRATEGY');

import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Client discovery strategy.
 * 客户端服务发现策略接口
 */
@Abstract()
export abstract class ClientDiscoveryStrategy {
    /**
     * Discover service instances.
     * 发现服务实例
     */
    abstract discover(): Promise<any> | Observable<any>;

    /**
     * Shutdown discovery.
     * 关闭发现
     */
    abstract onShutdown(): Promise<void>;
}

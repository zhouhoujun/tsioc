import { Abstract } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ClientEndpoint } from '../options';

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
    abstract discover(input?: any, context?: RequestContext): ClientEndpoint[] | void | Promise<ClientEndpoint[] | void> | Observable<ClientEndpoint[] | void>;

    /**
     * Shutdown discovery.
     * 关闭发现
     */
    abstract onShutdown(): Promise<void>;
}

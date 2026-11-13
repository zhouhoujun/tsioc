import { Abstract } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ClientEndpoint } from '../options';

/**
 * Load balance strategy.
 * 负载均衡策略接口
 */
@Abstract()
export abstract class ClientLoadBalanceStrategy {
    /**
     * Choose a service instance.
     * 选择一个服务实例
     */
    abstract chooseServer(endpoints?: ClientEndpoint[], input?: any, context?: RequestContext): ClientEndpoint | void | Promise<ClientEndpoint | void> | Observable<ClientEndpoint | void>;
}

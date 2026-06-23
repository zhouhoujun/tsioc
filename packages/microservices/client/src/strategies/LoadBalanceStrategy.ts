import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';

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
    abstract chooseServer(): Promise<any> | Observable<any>;
}

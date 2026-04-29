import { Observable } from 'rxjs';
import { token } from '@tsdi/ioc';

/**
 * Load balance strategy interface.
 * 负载均衡策略接口
 */
export interface ILoadBalanceStrategy {
    /**
     * Choose a service instance.
     * 选择一个服务实例
     */
    chooseServer(): Promise<any> | Observable<any>;
}

export const LOAD_BALANCE_STRATEGY = token<ILoadBalanceStrategy>('LOAD_BALANCE_STRATEGY');

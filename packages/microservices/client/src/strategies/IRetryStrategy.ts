import { Observable } from 'rxjs';
import { token } from '@tsdi/ioc';

/**
 * Retry strategy interface.
 * 重试策略接口
 */
export interface IRetryStrategy {
    /**
     * Apply retry to the observable.
     * 对 observable 应用重试
     */
    retry<T>(source: Observable<T>): Observable<T>;
}

export const RETRY_STRATEGY = token<IRetryStrategy>('RETRY_STRATEGY');

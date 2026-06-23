import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Retry strategy.
 * 重试策略接口
 */
@Abstract()
export abstract class RetryStrategy {
    /**
     * Apply retry to the observable.
     * 对 observable 应用重试
     */
    abstract retry<T>(source: Observable<T>): Observable<T>;
}

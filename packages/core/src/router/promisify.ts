import { isPromise } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';

/**
 * to promise.
 * @param target 
 * @returns 
 */
export function promisify<T>(target: T | Observable<T> | Promise<T>): Promise<T> {
    if (isObservable(target)) {
        return lastValueFrom(target)
    } else if (isPromise(target)) {
        return target
    }
    return Promise.resolve(target)
}

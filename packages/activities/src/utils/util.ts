import { isFunction } from '@tsdi/ioc';
import { lastValueFrom, Observable } from 'rxjs';
import { ActivityContext } from '../activities/Activity';


export async function evaluateValue<T>(value: T | Promise<T> | Observable<T> | ((context: ActivityContext) => T | Promise<T> | Observable<T>), context: ActivityContext): Promise<T> {
    value = isFunction(value) ? value(context) : value;
    if (value instanceof Promise) {
        return await value;
    } else if (value instanceof Observable) {
        return await lastValueFrom(value);
    } else {
        return value as T;
    }
}

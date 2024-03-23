import { isPromise } from '@tsdi/ioc';
import { isObservable, mergeMap, Observable, of } from 'rxjs';
import { Handler } from '../Handler';


/**
 * run endpoints.
 * @param endpoints 
 * @param ctx 
 * @param input 
 * @param isDone 
 * @returns 
 */
export function runHandlers<TInput, TContext = any>(endpoints: Handler[] | undefined, input: TInput, isDone?: ((input: TInput, context?: TContext) => boolean) | null, context?: TContext): Observable<any> {
    let $obs: Observable<any> = of(input);
    if (!endpoints || !endpoints.length) {
        return $obs;
    }

    endpoints.forEach(i => {
        $obs = $obs.pipe(
            mergeMap(() => {
                if (isDone && isDone(input, context)) return of(input);
                const $res = i.handle(input, context);
                if (isPromise($res) || isObservable($res)) return $res;
                return of($res);
            }));
    });

    return $obs;
}

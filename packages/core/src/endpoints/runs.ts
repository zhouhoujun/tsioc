import { InvocationContext, isPromise } from '@tsdi/ioc';
import { isObservable, mergeMap, Observable, of } from 'rxjs';
import { Endpoint } from '../Endpoint';


/**
 * run endpoints.
 * @param endpoints 
 * @param ctx 
 * @param input 
 * @param isDone 
 * @returns 
 */
export function runEndpoints(endpoints: Endpoint[] | undefined, ctx: InvocationContext, isDone: (ctx: InvocationContext) => boolean): Observable<any> {
    let $obs: Observable<any> = of(ctx);
    if (!endpoints || !endpoints.length) {
        return $obs;
    }

    endpoints.forEach(i => {
        $obs = $obs.pipe(
            mergeMap(() => {
                if (isDone(ctx)) return of(ctx);
                const $res = i.handle(ctx);
                if (isPromise($res) || isObservable($res)) return $res;
                return of($res);
            }));
    });

    return $obs;
}

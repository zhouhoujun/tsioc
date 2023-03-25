import { InvocationContext, isPromise } from '@tsdi/ioc';
import { isObservable, mergeMap, Observable, of } from 'rxjs';
import { Endpoint } from '../Endpoint';

/**
 * funcation Endpoint.
 */
export class FnEndpoint<TCtx extends InvocationContext = InvocationContext, TOutput = any> implements Endpoint<TCtx, TOutput> {

    constructor(private dowork: (ctx: TCtx) => TOutput | Observable<TOutput> | Promise<TOutput>) { }

    handle(context: TCtx): Observable<TOutput> {
        return of(context)
            .pipe(
                mergeMap(() => {
                    const $res = this.dowork(context);
                    if (isPromise($res) || isObservable($res)) return $res;
                    return of($res);
                })
            )
    }

    equals(target: any): boolean {
        return this.dowork === target?.dowork;
    }
}

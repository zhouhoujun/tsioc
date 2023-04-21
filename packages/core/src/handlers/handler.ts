import { isPromise } from '@tsdi/ioc';
import { Observable, isObservable, mergeMap, of } from 'rxjs';
import { Handler } from '../Handler';
import { Interceptor } from '../Interceptor';


/**
 * Interceptor Handler.
 */
export class InterceptorHandler<TInput = any, TOutput = any> implements Handler<TInput, TOutput> {

    constructor(private next: Handler<TInput, TOutput>, private interceptor: Interceptor<TInput, TOutput>) { }

    handle(context: TInput): Observable<TOutput> {
        return this.interceptor.intercept(context, this.next)
    }
}


/**
 * funcation handler.
 */
export class FnHandler<TInput = any, TOutput = any> implements Handler<TInput, TOutput> {

    constructor(private dowork: (ctx: TInput) => TOutput | Observable<TOutput> | Promise<TOutput>) { }

    handle(input: TInput): Observable<TOutput> {
        return of(input)
            .pipe(
                mergeMap(() => {
                    const $res = this.dowork(input);
                    if (isPromise($res) || isObservable($res)) return $res;
                    return of($res);
                })
            )
    }

    equals(target: any): boolean {
        return this.dowork === target?.dowork;
    }
}

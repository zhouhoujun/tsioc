import { isFunction, isPromise } from '@tsdi/ioc';
import { concat, concatAll, isObservable, merge, mergeAll, mergeMap, Observable, of } from 'rxjs';
import { Handler } from '../Handler';


/**
 * run handlers by sequence.
 * @param handlers 
 * @param input 
 * @param context 
 * @param isDone 
 * @returns 
 */
export function runSequence<TInput, TContext = any>(handlers: Handler[] | undefined, input: TInput, isDone?: ((input: TInput, context?: TContext) => boolean) | null): Observable<any>
/**
 * run handlers.
 * @param handlers 
 * @param input 
 * @param context 
 * @param isDone 
 * @returns 
 */
export function runSequence<TInput, TContext = any>(handlers: Handler[] | undefined, input: TInput, context?: TContext, isDone?: ((input: TInput, context?: TContext) => boolean) | null): Observable<any>;
export function runSequence<TInput, TContext = any>(handlers: Handler[] | undefined, input: TInput, contextOrFn?: TContext | ((input: TInput, context?: TContext) => boolean), isDone?: ((input: TInput, context?: TContext) => boolean) | null): Observable<any> {

    if (!handlers || !handlers.length) {
        return of(input);
    }
    let context: TContext | undefined;
    if (isFunction(contextOrFn)) {
        isDone = contextOrFn;
    } else {
        context = contextOrFn;
    }


    if (isDone) {
        let $obs: Observable<any> = of(input);
        handlers.forEach(i => {
            $obs = $obs.pipe(
                mergeMap(() => {
                    if (isDone && isDone(input, context)) return of(input);
                    const $res = i.handle(input, context);
                    if (isPromise($res) || isObservable($res)) return $res;
                    return of($res);
                }));
        });
        return $obs;
    } else {
        return concat(handlers.map(h => h.handle(input, context))).pipe(concatAll())
    }
}


/**
 * run handlers by parallel.
 * @param handlers 
 * @param ctx 
 * @param input 
 * @param isDone 
 * @returns 
 */
export function runParallel<TInput, TContext = any>(handlers: Handler[] | undefined, input: TInput, context?: TContext): Observable<any> {
    if (!handlers || !handlers.length) {
        return of(input);
    }

    return merge(handlers.map(m => m.handle(input, context))).pipe(mergeAll())
}
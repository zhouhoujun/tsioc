import { Injector, Token, isPromise } from '@tsdi/ioc';
import { Observable, isObservable, mergeMap, of } from 'rxjs';
import { Backend, Handler } from '../Handler';
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
 * intercepting hnalder.
 */
export class InterceptingHandler<TInput = any, TOutput = any> implements Handler<TInput, TOutput> {

    private chain?: Handler<TInput, TOutput>;

    constructor(
        private backend: Backend<TInput, TOutput>,
        private injector: Injector,
        private token: Token<Interceptor[]>
    ) { }

    handle(input: TInput): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.injector.get(this.token, [])
                .reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);
        }
        return this.chain.handle(input);
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

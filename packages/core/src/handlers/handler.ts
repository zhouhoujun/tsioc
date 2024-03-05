import { isFunction, isPromise } from '@tsdi/ioc';
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

    private chain?: Handler<TInput, TOutput> | null;

    constructor(
        private backend: Backend<TInput, TOutput> | (() => Backend<TInput, TOutput>),
        private interceptors: Interceptor[] | (() => Interceptor[]) = []
    ) { }

    handle(input: TInput): Observable<TOutput> {
        return this.getChain().handle(input);
    }

    protected getChain(): Handler<TInput, TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain;
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): Handler<TInput, TOutput> {
        return (isFunction(this.interceptors) ? this.interceptors() : this.interceptors)
            .reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), isFunction(this.backend) ? this.backend() : this.backend);
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

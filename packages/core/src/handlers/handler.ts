import { isFunction, isPromise } from '@tsdi/ioc';
import { Observable, isObservable, of, from } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { Interceptor } from '../Interceptor';


/**
 * Interceptor Handler.
 */
export class InterceptorHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {

    constructor(private next: Handler<TInput, TOutput, TContext>, private interceptor: Interceptor<TInput, TOutput, TContext>) { }

    handle(input: TInput, context?: TContext): Observable<TOutput> {
        return this.interceptor.intercept(input, this.next, context)
    }
}

/**
 * intercepting hnalder.
 */
export class InterceptingHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {

    private chain?: Handler<TInput, TOutput, TContext> | null;

    constructor(
        private backend: Backend<TInput, TOutput, TContext> | (() => Backend<TInput, TOutput, TContext>),
        private interceptors: Interceptor[] | (() => Interceptor[]) = []
    ) { }

    handle(input: TInput, context?: TContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain.handle(input, context);
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
export class FnHandler<TInput = any, TOutput = any, TContext= any> implements Handler<TInput, TOutput, TContext> {

    constructor(private dowork: (ctx: TInput, context?: TContext) => TOutput | Observable<TOutput> | Promise<TOutput>) { }

    handle(input: TInput, context?: TContext): Observable<TOutput> {
        const $res = this.dowork(input, context);
        if (isObservable($res)) {
            return $res;
        }
        return isPromise($res) ? from($res) : of($res);
    }

    equals(target: any): boolean {
        return this.dowork === target?.dowork;
    }
}

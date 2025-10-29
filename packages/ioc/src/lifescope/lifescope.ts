import { composeInterceptors, Handler, HandlerFn, InterceptorFn, InterceptorLike, invokeTail, NextOpter, toHandlerFn } from '../handler';
import { Runtime } from '../runtime';
import { isFunction, isNumber } from '../utils/chk';

/**
 * handler scope.
 */
export class HandlerScope<TInput = any, TContext = any, TOutput = any> implements Handler<TInput, TOutput, TContext> {

    private _chain?: InterceptorFn<TInput> | null;
    private interceptors: InterceptorLike<TInput>[]

    constructor(
        readonly runtime: Runtime | null,
        private backend: HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>,
        interceptors: InterceptorLike<TInput, TOutput, TContext>[] = []
    ) {
        this.interceptors = interceptors.slice();
    }

    handle(input: TInput, context: TContext, next?: NextOpter<TOutput, TContext> | ((input: TInput) => any)): TOutput {
        const chain = this.getChain();
        return invokeTail<any>(() => chain(input, isFunction(this.backend) ? this.backend : toHandlerFn(this.backend), context ?? this.runtime?.context), next);
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    use(interceptors: InterceptorLike | InterceptorLike[], order?: number): this {
        const iterceps = Array.isArray(interceptors) ? interceptors : [interceptors]
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, ...iterceps)
        } else {
            this.interceptors.push(...iterceps);
        }
        this.reset();
        return this;
    }

    getIndexOf(interceptor: InterceptorLike) {
        return this.interceptors.indexOf(interceptor)
    }

    protected getChain(): InterceptorFn<TInput> {
        if (!this._chain) {
            this._chain = this.compose();
        }
        return this._chain;
    }

    protected reset(): void {
        this._chain = null;
    }

    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected compose(): InterceptorFn {
        return composeInterceptors(this.interceptors)
    }

}
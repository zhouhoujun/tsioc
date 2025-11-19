import { composeInterceptors, Handler, HandlerFn, InterceptorFn, InterceptorLike, invokeTail, TailNext, toHandlerFn } from '../handler';
import { isFunction, isNumber } from '../utils/chk';

/**
 * runtime handler.
 */
export class RuntimeHandler<TInput = any, TContext = any, TOutput = any> implements Handler<TInput, TOutput, TContext> {

    private _chain?: InterceptorFn<TInput> | null;
    private interceptors: InterceptorLike<TInput>[]

    constructor(
        private backend: HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>,
        interceptors?: InterceptorLike<TInput, TOutput, TContext>[]
    ) {
        this.interceptors = interceptors?.slice() ?? [];
    }

    handle(input: TInput, context: TContext, next?: TailNext<TOutput, TContext>): TOutput {
        const chain = this.getChain();
        return next ? invokeTail<any>(() => chain(input, isFunction(this.backend) ? this.backend : toHandlerFn(this.backend), context), next)
            : chain(input, isFunction(this.backend) ? this.backend : toHandlerFn(this.backend), context);
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
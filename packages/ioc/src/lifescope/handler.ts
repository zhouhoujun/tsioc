import { composeInterceptors, Handler, HandlerFn, InterceptingHandler, InterceptorFn, InterceptorLike } from '../handler';
import { isNumber } from '../utils/chk';

/**
 * runtime handler.
 */
export class RuntimeHandler<TInput = any, TOutput = any, TContext = any> extends InterceptingHandler<TInput, TOutput, TContext> implements Handler<TInput, TOutput, TContext> {


    constructor(
        backend: HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>,
        interceptors?: InterceptorLike<TInput, TOutput, TContext>[]
    ) {
        super(backend, interceptors?.slice() ?? []);
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


    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected compose(): InterceptorFn {
        return composeInterceptors(this.interceptors)
    }

}
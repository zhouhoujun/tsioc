import { Handler, HandleResult, HandlerFn, TailNext } from '../handlers/handler';
import { InterceptorFn, InterceptorLike } from '../handlers/interceptor';
import { composeInterceptors, invokeTail } from '../handlers/compose';
import { isFunction, isNumber } from '../utils/chk';

/**
 * runtime handler.
 */
export class RuntimeHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {

    private chain?: InterceptorFn<TInput, TOutput, TContext> | null;
    private backend: HandlerFn<TInput, TOutput, TContext>;
    protected interceptors: InterceptorLike[];
    constructor(
        backend: HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>,
        interceptors?: InterceptorLike<TInput, TOutput, TContext>[]
    ) {
        if (isFunction(backend)) {
            this.backend = backend
        } else {
            this.backend = (req, ctx) => (backend as Handler).handle(req, ctx);
        }
        this.interceptors = interceptors?.slice(0) ?? []
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


    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): HandleResult<TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return tail ? invokeTail(() => this.chain!(input, this.backend, context), tail) : this.chain(input, this.backend, context);
    }
    protected reset() {
        this.chain = null;
    }

    protected compose(): InterceptorFn<TInput, TOutput, TContext> {
        return composeInterceptors(this.interceptors);
    }


}
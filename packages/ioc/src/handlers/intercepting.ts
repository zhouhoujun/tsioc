import { Handler, HandlerFn, HandlerLike } from './handler';
import { isFunction } from '../utils/chk';
import { Interceptor, InterceptorFn, InterceptorLike } from './interceptor';
import { TailNext } from './handler';
import { invokeTail, composeInterceptors, toHandlerFn } from './compose';




/**
 * intercepting hnalder.
 */
export class InterceptingHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {

    private chain?: InterceptorFn<TInput, TOutput, TContext> | null;
    private backend: HandlerFn<TInput, TOutput, TContext>;

    constructor(
        backend: HandlerLike<TInput, TOutput, TContext>,
        protected interceptors: InterceptorLike[] | (() => InterceptorLike[])
    ) {
        if (isFunction(backend)) {
            this.backend = backend
        } else {
            this.backend = (req, ctx) => (backend as Handler).handle(req, ctx);
        }
    }

    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): TOutput {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return tail ? invokeTail(() => this.chain!(input, this.backend, context), tail) : this.chain(input, this.backend, context);
    }
    protected reset() {
        this.chain = null;
    }

    protected compose(): InterceptorFn<TInput, TOutput, TContext> {
        return composeInterceptors(isFunction(this.interceptors) ? this.interceptors() : this.interceptors);
    }
}

/**
 * compose interceptor.
 */
export class ComposeInterceptor<TInput = any, TOutput = any, TContext = any> implements Interceptor<TInput, TOutput, TContext> {

    private chain?: InterceptorFn<TInput, TOutput, TContext> | null;

    constructor(
        protected interceptors: InterceptorLike[]
    ) { }

    intercept(input: TInput, next: Handler<TInput, TOutput, TContext>, context: TContext): TOutput {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain(input, toHandlerFn(next), context);
    }
    protected reset() {
        this.chain = null;
    }

    protected compose(): InterceptorFn<TInput, TOutput, TContext> {
        return composeInterceptors(this.interceptors);
    }
}


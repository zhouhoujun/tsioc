import { composeInterceptors, HandleResult, invokeTail, isFunction, TailNext } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationHandlerFn, ApplicationHandlerLike, RunableContext } from '../ApplicationHandler';
import { ApplicationInterceptorFn, ApplicationInterceptorLike } from '../ApplicationInterceptor';


/**
 * intercepting hnalder.
 */
export class InterceptingHandler<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> implements ApplicationHandler<TInput, TOutput, TContext> {

    private chain?: ApplicationInterceptorFn<TInput, TOutput, TContext> | null;
    private backend: ApplicationHandlerFn<TInput, TOutput, TContext>;

    constructor(
        backend: ApplicationHandlerLike<TInput, TOutput, TContext>,
        private interceptors: ApplicationInterceptorLike[] | (() => ApplicationInterceptorLike[]) = []
    ) {
        if (isFunction(backend)) {
            this.backend = backend
        } else {
            this.backend = (req, ctx) => (backend as ApplicationHandler).handle(req, ctx);
        }
    }

    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): HandleResult<TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return tail? invokeTail(()=> this.chain!(input, this.backend, context), tail) : this.chain(input, this.backend, context);
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): ApplicationInterceptorFn<TInput, TOutput, TContext> {
        return composeInterceptors(isFunction(this.interceptors) ? this.interceptors() : this.interceptors)
    }
}

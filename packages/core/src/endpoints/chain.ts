import { EMPTY, Injector, InvocationContext, isArray, isFunction, isNumber, ProvdierOf, Token, toProvider, TypeOf } from '@tsdi/ioc';
import { EndpointBackend } from '../Endpoint';
import { Interceptor, InterceptorService } from '../Interceptor';
import { AbstractEndpoint } from './endpoint';

/**
 * Simple Endpoint chain. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export class Endpoints<TCtx extends InvocationContext = InvocationContext, TOutput = any> extends AbstractEndpoint<TCtx, TOutput> {

    constructor(
        protected readonly backend: EndpointBackend<TCtx, TOutput>,
        protected readonly interceptors: Interceptor<TCtx, TOutput>[]) {
        super()
    }

    protected getBackend(): EndpointBackend<TCtx, TOutput> {
        return this.backend;
    }

    protected getInterceptors(): Interceptor<TCtx, TOutput>[] {
        return this.interceptors;
    }

}


/**
 * Endpoint chain. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export class EndpointChain<TCtx extends InvocationContext = InvocationContext, TOutput = any> extends AbstractEndpoint<TCtx, TOutput> implements InterceptorService {

    constructor(
        protected injector: Injector,
        protected token: Token<Interceptor<TCtx, TOutput>[]>,
        protected backend: TypeOf<EndpointBackend<TCtx, TOutput>>) {
        super();
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor<TCtx, TOutput>> | ProvdierOf<Interceptor<TCtx, TOutput>>[], order?: number): this {
        this.regMulti(this.token, interceptor, order);
        this.reset();
        return this;
    }

    /**
     *  get backend endpoint. 
     */
    protected getBackend(): EndpointBackend<TCtx, TOutput> {
        return isFunction(this.backend) ? this.injector.get(this.backend) : this.backend;
    }

    protected getInterceptors(): Interceptor<TCtx, TOutput>[] {
        return this.injector.get(this.token, EMPTY)
    }


    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], order?: number) {
        if (isArray(providers)) {
            const hasOrder = isNumber(order);
            this.injector.inject(providers.map((r, i) => toProvider(token, r, true, hasOrder ? order + i : undefined)))
        } else {
            this.injector.inject(toProvider(token, providers, true, order));
        }
    }

}
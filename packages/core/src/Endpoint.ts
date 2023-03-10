import { Abstract, EMPTY, Injector, InvocationContext, InvokerLike, isFunction, isPromise, isType, Token, Type, TypeOf } from '@tsdi/ioc';
import { isObservable, mergeMap, Observable, of } from 'rxjs';
import { Interceptor } from './Interceptor';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TInput = any, TOutput = any> {
    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    handle(input: TInput, context: InvocationContext): Observable<TOutput>;
}


/**
 * A final {@link Endpoint} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Middleware sit between the `Client|Server` interface and the `EndpointBackend`.
 *
 * When injected, `EndpointBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
@Abstract()
export abstract class EndpointBackend<TInput = any, TOutput = any> implements Endpoint<TInput, TOutput> {
    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(input: TInput, context: InvocationContext): Observable<TOutput>;
}

/**
 * Interceptor Endpoint.
 */
export class InterceptorEndpoint<TInput, TOutput> implements Endpoint<TInput, TOutput> {
    constructor(private next: Endpoint<TInput, TOutput>, private interceptor: Interceptor<TInput, TOutput>) { }

    handle(input: TInput, context: InvocationContext): Observable<TOutput> {
        return this.interceptor.intercept(input, this.next, context)
    }
}

/**
 * abstract endpoint.
 */
@Abstract()
export abstract class AbstractEndpoint<TInput = any, TOutput = any> implements Endpoint<TInput, TOutput> {

    private chain: Endpoint<TInput, TOutput> | null = null;

    handle(input: TInput, context: InvocationContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain.handle(input, context)
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): Endpoint<TInput, TOutput> {
        return this.getInterceptors().reduceRight(
            (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), this.getBackend());
    }

    /**
     *  get backend endpoint. 
     */
    protected abstract getBackend(): EndpointBackend<TInput, TOutput>;

    /**
     *  get interceptors. 
     */
    protected abstract getInterceptors(): Interceptor<TInput, TOutput>[];

}

/**
 * Dynamic endpoint.
 */
export class DynamicEndpoint<TInput = any, TOutput = any> extends AbstractEndpoint<TInput, TOutput> {

    constructor(
        protected injector: Injector,
        private token: Token<Interceptor<TInput, TOutput>[]>,
        private backend: TypeOf<EndpointBackend<TInput, TOutput>>) {
        super();
    }

    use(interceptor: TypeOf<Interceptor<TInput, TOutput>>, order?: number): this {
        this.multiOrder(this.token, interceptor, order);
        this.reset();
        return this;
    }

    /**
     *  get backend endpoint. 
     */
    protected getBackend(): EndpointBackend<TInput, TOutput> {
        return isFunction(this.backend) ? this.injector.get(this.backend) : this.backend;
    }

    protected getInterceptors(): Interceptor<TInput, TOutput>[] {
        return this.injector.get(this.token, EMPTY)
    }

    protected multiOrder<T>(provide: Token, target: Type<T> | T, multiOrder?: number) {
        if (isType(target)) {
            this.injector.inject({ provide, useClass: target, multi: true, multiOrder })
        } else {
            this.injector.inject({ provide, useValue: target, multi: true, multiOrder })
        }
    }
}


/**
 * Endpoint chain. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export class EndpointChain<TInput = any, TOutput = any> extends AbstractEndpoint<TInput, TOutput> {

    constructor(
        protected readonly backend: EndpointBackend<TInput, TOutput>,
        protected readonly interceptors: Interceptor<TInput, TOutput>[]) {
        super()
    }

    protected getBackend(): EndpointBackend<TInput, TOutput> {
        return this.backend;
    }

    protected getInterceptors(): Interceptor<TInput, TOutput>[] {
        return this.interceptors;
    }

}


/**
 * run invokers.
 * @param invokders 
 * @param ctx 
 * @param input 
 * @param isDone 
 * @returns 
 */
export function runInvokers(invokders: InvokerLike[] | undefined, ctx: InvocationContext, input: any, isDone: (ctx: InvocationContext) => boolean): Observable<any> {
    let $obs = of(input);
    if (!invokders || !invokders.length) {
        return $obs;
    }

    invokders.forEach(i => {
        $obs = $obs.pipe(
            mergeMap(r => {
                if (isDone(ctx)) return of(r);
                const $res = isFunction(i) ? i(ctx) : i.invoke(ctx);
                if (!isPromise($res) || !isObservable($res)) return of($res);
                return $res;
            }));
    });
    return $obs;
}

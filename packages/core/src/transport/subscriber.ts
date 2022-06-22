import { Abstract, EMPTY, InvocationContext, isFunction, isNumber, Token } from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { Channel } from './channel';
import { Endpoint, EndpointBackend, InterceptorChain, InterceptorInst, InterceptorType } from './endpoint';

@Abstract()
export abstract class Subscriber<TRequest = any, TResponse = any> {

    @Log()
    readonly logger!: Logger;

    private _chain?: Endpoint<TRequest, TResponse>;
    private _interceptors?: InterceptorInst<TRequest, TResponse>[];

    constructor(readonly context: InvocationContext, options?: SubscriberOptions<TRequest, TResponse>) {
        this.initialize(this.initOption(options));
    }

    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected initOption(options?: SubscriberOptions<TRequest, TResponse>): SubscriberOptions<TRequest, TResponse> {
        return options ?? {};
    }

    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected initialize(options: SubscriberOptions<TRequest, TResponse>) {

        if (options.interceptors && options.interceptors.length) {
            const iToken = this.getInterceptorsToken();
            const interceptors = options.interceptors.map(m => {
                if (isFunction(m)) {
                    return { provide: iToken, useClass: m, multi: true }
                } else {
                    return { provide: iToken, useValue: m, multi: true }
                }
            });
            this.context.injector.inject(interceptors);
        }
    }

    /**
     * get mutil token of interceptors.
     */
    protected abstract getInterceptorsToken(): Token<InterceptorInst<TRequest, TResponse>[]>;

    /**
     * client interceptors.
     */
    get interceptors(): InterceptorInst<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = [...this.context.injector.get(this.getInterceptorsToken(), EMPTY)]
        }
        return this._interceptors
    }

    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    use(interceptor: InterceptorInst<TRequest, TResponse>, order?: number): this {
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, interceptor)
        } else {
            this.interceptors.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(this.getBackend(), this.interceptors)
        }
        return this._chain
    }

    /**
     * channel of publisher
     */
    abstract get channel(): Channel;
    /**
     * close subscriber.
     */
    abstract close(): Promise<void>;

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

    // protected createContext(options?: TOption & ResponseAs): RequestContext {
    //     return (options as any)?.context ?? new ClientContext(
    //         this.context.injector, this as any,
    //         { parent: this.context, responseType: options?.responseType, observe: options?.observe });
    // }



    // protected abstract buildRequest(url: TRequest | string, options?: TOption): TRequest;

    protected abstract connect(): Promise<void>;

}


/**
 * Subscriber options.
 */
export interface SubscriberOptions<TRequest, TResponse> {
    interceptors?: InterceptorType<TRequest, TResponse>[];
}
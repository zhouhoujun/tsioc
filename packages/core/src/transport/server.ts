import { Abstract, EMPTY, InvocationContext, isNumber } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Subscription } from 'rxjs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { InterceptorChain, Endpoint, EndpointBackend, MiddlewareBackend, MiddlewareInst, Interceptor, InterceptorInst } from './endpoint';
import { TransportContext } from './context';


/**
 * abstract transport server.
 */
@Abstract()
@Runner('start')
export abstract class TransportServer<TRequest, TResponse, Tx extends TransportContext = TransportContext> implements OnDispose {

    @Log()
    protected readonly logger!: Logger;

    private _chain?: Endpoint<TRequest, TResponse>;
    private _middles?: MiddlewareInst<Tx>[];
    private _interceptors?: InterceptorInst<TRequest, TResponse>[];

    /**
     * server context.
     */
    abstract get context(): InvocationContext;

    /**
     * server middlewares.
     */
    get middlewares(): MiddlewareInst<Tx>[] {
        if (!this._middles) {
            this._middles = [...this.getRegMidderwares() ?? EMPTY]
        }
        return this._middles
    }

    /**
     * server interceptors.
     */
    get interceptors(): InterceptorInst<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = [...this.getRegInterceptors() ?? EMPTY]
        }
        return this._interceptors
    }


    /**
     * start server.
     */
    abstract start(): Promise<void>;

    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    usetInterceptor(interceptor: InterceptorInst<TRequest, TResponse>, order?: number): this {
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, interceptor)
        } else {
            this.interceptors.push(interceptor)
        }
        this._chain = null!;
        return this
    }
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: MiddlewareInst<Tx>, order?: number): this {
        if (isNumber(order)) {
            this.middlewares.splice(order, 0, middleware)
        } else {
            this.middlewares.push(middleware)
        }
        this._chain = null!;
        return this
    }

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(new MiddlewareBackend(this.getBackend(), this.middlewares), this.interceptors)
        }
        return this._chain
    }

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;
    /**
     * lazy create context.
     */
    protected abstract createContext(request: TRequest, response: TResponse): Tx;
    /**
     * lazy get injected middlewares.
     */
    protected abstract getRegMidderwares(): MiddlewareInst<Tx>[];

    /**
     * lazy get injected interceptors.
     */
    protected abstract getRegInterceptors(): InterceptorInst<TRequest, TResponse>[];


    protected requestHandler(request: TRequest, response: TResponse) {
        const ctx = this.createContext(request, response) as Tx;
        ctx.injector.setValue(Logger, this.logger);

        const cancel = this.chain().handle(request, ctx)
            .subscribe({
                complete: () => {
                    ctx.destroy()
                }
            });

        this.bindEvent(ctx, cancel)
    }

    protected abstract bindEvent(ctx: Tx, cancel: Subscription): void;


    /**
     * close server.
     */
    abstract close(): Promise<void>;
    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close()
    }

}

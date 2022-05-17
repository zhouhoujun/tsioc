import { Abstract, ArgumentError, createContext, EMPTY, InvocationContext, isFunction, isNil, isNumber, Token } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, finalize, mergeMap } from 'rxjs/operators';
import { InterceptorChain, Endpoint, EndpointBackend, InterceptorInst, InterceptorType } from './endpoint';


/**
 * client options.
 */
export interface ClientOptions<TRequest, TResponse> {
    interceptors?: InterceptorType<TRequest, TResponse>[];
}

/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest, TResponse, TOption = any> {

    @Log()
    protected readonly logger!: Logger;

    private _chain?: Endpoint<TRequest, TResponse>;
    private _interceptors?: InterceptorInst<TRequest, TResponse>[];


    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected initialize(options: ClientOptions<TRequest, TResponse>) {

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

    protected abstract getInterceptorsToken(): Token<InterceptorInst<TRequest, TResponse>[]>;

    /**
     * client context.
     */
    abstract get context(): InvocationContext;

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
     * Sends an `HttpRequest` and returns a stream of `HttpEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `HttpEvent`s.
     */
    send(url: string, options?: TOption): Observable<TResponse>;
    /**
     * Sends an `HttpRequest` and returns a stream of `HttpEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `HttpEvent`s.
     */
    send(req: TRequest): Observable<TResponse>;
    send(req: TRequest | string, options?: TOption): Observable<TResponse> {
        if (isNil(req)) {
            return throwError(() => new ArgumentError('Invalid message'))
        }
        let ctx: InvocationContext;
        return defer(() => this.connect()).pipe(
            catchError((err, caught) => {
                return throwError(() => this.onError(err))
            }),
            mergeMap(() => {
                ctx = this.createContext();
                return this.request(ctx, req, options)
            }),
            finalize(() => {
                ctx?.destroy()
            })
        )
    }

    protected request(context: InvocationContext, req: TRequest | string, options?: TOption) {
        return this.chain().handle(this.buildRequest(req, options), context);
    }

    protected onError(err: Error): Error {
        return err;
    }

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

    protected createContext(): InvocationContext {
        return createContext(this.context);
    }

    protected abstract buildRequest(url: TRequest | string, options?: TOption): TRequest;

    protected abstract connect(): Promise<void>;

}

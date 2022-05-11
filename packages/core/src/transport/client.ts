import { Abstract, ArgumentError, createContext, EMPTY, InvocationContext, isNil, isNumber } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { InterceptorChain, Endpoint, EndpointBackend, InterceptorInst } from './endpoint';


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
     * client context.
     */
    abstract get context(): InvocationContext;

    /**
     * client interceptors.
     */
    get interceptors(): InterceptorInst<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = [...this.getRegInterceptors() ?? EMPTY];
        }
        return this._interceptors;
    }

    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    use(interceptor: InterceptorInst<TRequest, TResponse>, order?: number): this {
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, interceptor);
        } else {
            this.interceptors.push(interceptor);
        }
        this._chain = null!;
        return this;
    }

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(this.getBackend(), this.interceptors);
        }
        return this._chain;
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
            return throwError(() => new ArgumentError('Invalid message'));
        }
        let ctx = this.createContext();
        return defer(async () => {
            await this.connect();
            return this.buildRequest(ctx, req, options);
        }).pipe(
            concatMap((req) => this.chain().handle(req, ctx)),
            catchError((err, caught) => {
                this.logger.error(err);
                return throwError(() => err);
            }),
            finalize(() => {
                ctx.destroy();
            })
        );
    }

    /**
     * get registed interceptors.
     */
    protected abstract getRegInterceptors(): InterceptorInst[];

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

    protected createContext(): InvocationContext {
        return createContext(this.context);
    }

    protected abstract buildRequest(context: InvocationContext, url: TRequest | string, options?: TOption): TRequest;

    protected abstract connect(): Promise<void>;

}

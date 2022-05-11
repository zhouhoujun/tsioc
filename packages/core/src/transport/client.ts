import { Abstract, ArgumentError, createContext, InvocationContext, isNil } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { InterceptorChain, Endpoint, EndpointBackend, Interceptor } from './endpoint';


/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest, TResponse, TOption = any> {

    @Log()
    protected readonly logger!: Logger;

    protected _chain?: Endpoint<TRequest, TResponse>;

    /**
     * client context.
     */
    abstract get context(): InvocationContext;

    /**
     * get interceptors.
     */
    abstract getInterceptors(): Interceptor[];

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(this.getBackend(), this.getInterceptors());
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

    protected createContext(): InvocationContext {
        return createContext(this.context);
    }

    protected abstract buildRequest(context: InvocationContext, url: TRequest | string, options?: TOption): TRequest;

    protected abstract connect(): Promise<void>;

}

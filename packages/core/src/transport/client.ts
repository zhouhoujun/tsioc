import { Abstract, InvocationContext, isNil } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { TransportError } from './error';
import { InterceptorChain, Endpoint, EndpointBackend, Interceptor } from './endpoint';


/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest, TResponse, TOption = any> implements OnDispose {

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
     * connect.
     */
    abstract connect(): Promise<any>;
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
            return throwError(() => new TransportError(400, 'Invalid message'));
        }
        let ctx = this.createContext();
        return defer(async () => {
            await this.connect();
            return this.buildRequest(ctx, req, options);
        }).pipe(
            concatMap((req) => this.chain().handle(req, ctx)),
            catchError((err, caught) => {
                this.logger.error(err);
                return caught;
            }),
            finalize(() => {
                ctx.destroy();
            })
        );
    }

    protected createContext(): InvocationContext {
        return InvocationContext.create(this.context);
    }

    protected abstract buildRequest(context: InvocationContext, req: TRequest | string, options?: TOption): Promise<TRequest> | TRequest;

    /**
     * close client.
     */
    abstract close(): Promise<void>;

    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}

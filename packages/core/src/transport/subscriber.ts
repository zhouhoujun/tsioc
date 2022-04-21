import { Abstract, isFunction, isNil } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { TransportError } from './error';
import { InterceptorChain, Endpoint, EndpointBackend, Interceptor, InterceptorFn } from './endpoint';

@Abstract()
export abstract class Subscriber<TRequest, TResponse, TOption = any> implements OnDispose {

    @Log()
    protected readonly logger!: Logger;
    
    protected _chain?: Endpoint<TRequest, TResponse>;
    private _interceptors: Interceptor<TRequest, TResponse>[] = [];
    /**
     * intercept on the transport request.
     * @param interceptor 
     */
    intercept(interceptor: Interceptor<TRequest, TResponse> | InterceptorFn<TRequest, TResponse>): this {
        this._interceptors.push(isFunction(interceptor) ? { intercept: interceptor } : interceptor);
        return this;
    }

    /**
     * get backend endpoint.
     */
    abstract getBackend(): EndpointBackend<TRequest, TResponse>;
    /**
     * get interceptors.
     * @returns 
     */
    protected getInterceptors(): Interceptor<TRequest, TResponse>[] {
        return this._interceptors;
    }

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
        return defer(async () => {
            await this.connect();
            return this.buildRequest(req, options);
        }).pipe(
            concatMap((req) => this.chain().handle(req))
        );
    }

    protected abstract buildRequest(req: TRequest | string, options?: TOption): Promise<TRequest> | TRequest;

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

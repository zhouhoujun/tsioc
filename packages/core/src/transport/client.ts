import { Abstract, isNil } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { TransportError } from './error';
import { Endpoint, Middleware, MiddlewareFn } from './endpoint';
import { RequestBase, ResponseBase } from './packet';

/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest extends RequestBase, TResponse extends ResponseBase> implements OnDispose {

    @Log()
    protected readonly logger!: Logger;
    /**
     * sets the Request that are applied to the outgoing transport request before it's invoked.
     * @param middleware 
     */
    abstract useBefore(middleware: Middleware<TRequest, TResponse> | MiddlewareFn<TRequest, TResponse>): this;
    /**
     * sets the Response that are applied to the incoming
     * transport response prior to it being decoded. This is useful for obtaining
     * response metadata and adding onto the context prior to decoding.
     * @param middleware 
     */
    abstract useAfter(middleware: Middleware<TRequest, TResponse> | MiddlewareFn<TRequest, TResponse>): this;
    /**
     * Finalizer middleware is executed at the end of every transport request. By default, no finalizer is registered.
     * @param middleware 
     */
    abstract useFinalizer(middleware: Middleware<TRequest, TResponse> | MiddlewareFn<TRequest, TResponse>): this;
    /**
     * transport handler.
     */
    abstract getEndpoint(): Endpoint<TRequest, TResponse>;
    /**
     * connect.
     */
    abstract connect(): Promise<any>;
    /**
     * Sends an `HttpRequest` and returns a stream of `HttpEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `HttpEvent`s.
     */
    send(url: string, options?: any): Observable<TResponse>;
    /**
     * Sends an `HttpRequest` and returns a stream of `HttpEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `HttpEvent`s.
     */
    send(req: TRequest): Observable<TResponse>;
    send(req: TRequest | string, options?: any): Observable<TResponse> {
        if (isNil(req)) {
            return throwError(() => new TransportError(400, 'Invalid message'));
        }
        return defer(async () => {
            await this.connect();
            return this.buildRequest(req, options);
        }).pipe(
            concatMap((req) => this.getEndpoint().handle(req))
        );
    }


    protected abstract buildRequest(req: TRequest | string, options?: any): Promise<TRequest> | TRequest;


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

import { Abstract, isNil } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { TransportError } from './error';
import { Endpoint } from './endpoint';
import { RequestBase, ResponseBase } from './packet';

/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest extends RequestBase , TResponse extends ResponseBase> implements OnDispose {

    @Log()
    protected readonly logger!: Logger;
    /**
     * transport handler.
     */
    abstract get endpoint(): Endpoint<TRequest, TResponse>;
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
            concatMap((req) => this.endpoint.handle(req))
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

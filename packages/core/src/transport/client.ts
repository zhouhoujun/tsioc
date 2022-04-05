import { Abstract, InvocationContext, isNil } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { InvalidMessageError } from './error';
import { TransportRequest, TransportResponse, RequestMethod, TransportEvent } from './packet';
import { Endpoint } from './endpoint';
import { TransportContext } from './context';

/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<T extends TransportContext = TransportContext> implements OnDispose {

    @Log()
    protected readonly logger!: Logger;
    /**
     * transport handler.
     */
    abstract get endpoint(): Endpoint<T>;
    /**
     * connect.
     */
    abstract connect(): Promise<any>;
    /**
     * Sends an `HttpRequest` and returns a stream of `HttpEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `HttpEvent`s.
     */
    send<R>(req: TransportRequest<any>): Observable<TransportResponse<R>>;

    /**
     * send request.
     * @param pattern request pattern.
     * @param body send data.
     */
    send<R>(pattern: string, options: {
        body?: any;
        method?: RequestMethod,
        observe?: 'body',
        headers?: { [header: string]: string | string[] } | any,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        responseType?: 'json',
        withCredentials?: boolean
    }): Observable<R>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type `R`.
     */
    send<R>(pattern: string, options: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'events',
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<TransportEvent<R>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    send<R>(pattern: string, options: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'events',
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        responseType?: 'text',
        withCredentials?: boolean,
    }): Observable<TransportEvent<string>>;

    /**
     * Constructs a request which interprets the body as an `ArrayBuffer`
     * and returns the full {@link TransportResponse}.
     * @param pattern 
     * @param options  The options to send with the request.
     * 
     * @return An `Observable` of the `HttpResponse`, with the response body as an `ArrayBuffer`. 
     */
    send<T>(pattern: string, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'response',
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<TransportResponse<T>>;
    /**
     * Constructs a request which interprets the body as an `ArrayBuffer`
     * and returns the full {@link TransportResponse}.
     * @param pattern 
     * @param options  The options to send with the request.
     * 
     * @return An `Observable` of the `HttpResponse`, with the response body as an `ArrayBuffer`. 
     */
    send(pattern: string, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<TransportResponse<ArrayBuffer>>;

    /**
     * Constructs a request which interprets the body as a `Blob` and returns the full `HttpResponse`.
     * 
     * @param pattern 
     * @param options the options to send with the request.
     * 
     * @return An `Observable` of the {@link TransportResponse}, with the response body of type `Blob`. 
     */
    send(pattern: string, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'response',
        reportProgress?: boolean,
        responseType?: 'blob',
        withCredentials?: boolean,
    }): Observable<TransportResponse<Blob>>;

    /**
     * send request.
     * @param pattern 
     * @param options 
     */
    send(pattern: string, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'response',
        reportProgress?: boolean,
        responseType?: 'text',
        withCredentials?: boolean,
    }): Observable<TransportResponse<string>>;

    /**
     * send request.
     * @param pattern 
     * @param options 
     */
    send(pattern: string, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    }): Observable<any>;

    /**
     * send request.
     * @param pattern request pattern.
     * @param body send data.
     */
    send(pattern: string | TransportRequest, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    }): Observable<any> {
        if (isNil(pattern)) {
            return throwError(() => new InvalidMessageError());
        }

        return defer(async () => this.connect()).pipe(
            concatMap(() => this.sendRequest(pattern, options))
        );
    }

    protected sendRequest(pattern: string | TransportRequest, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    }): Observable<any> {
        return this.endpoint.endpoint(this.createContext(pattern, options));
    }

    protected abstract createContext(pattern: string | TransportRequest, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] } | any,
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> } | any,
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    }): T;

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

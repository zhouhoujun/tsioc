import { Abstract, InvocationContext, isNil, isString } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { InvalidMessageError } from './error';
import { TransportRequest, TransportResponse, RequestMethod, TransportEvent } from './packet';
import { TransportHandler } from './handler';

/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient implements OnDispose {

    @Logger()
    protected readonly logger!: ILogger;
    /**
     * transport handler.
     */
    abstract get handler(): TransportHandler<TransportRequest, TransportResponse>;
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
        const req = isString(pattern) ? this.serializeRequest(this.normalizePattern(pattern), options) : pattern;
        return this.handler.handle(req);
    }

    /**
     * close client.
     */
    abstract close(): Promise<void>;

    protected normalizePattern(pattern: string): string {
        return pattern;
    }

    protected serializeRequest(pattern: string, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: InvocationContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean
    }): TransportRequest {
        return { pattern, ...options } as TransportRequest;
    }

    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}

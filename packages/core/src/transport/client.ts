import { Abstract, isNil } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { connectable, defer, Observable, Observer, Subject, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { InvalidMessageError, TransportError } from './error';
import { Pattern, Protocol, TransportRequest, TransportResponse, RequestMethod, TransportEvent } from './packet';
import { stringify, TransportContext } from './context';
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
     * send request.
     * @param pattern request pattern.
     * @param body send data.
     */
    send<R>(pattern: Pattern, options: {
        body?: any;
        method?: RequestMethod,
        observe?: 'body',
        headers?: { [header: string]: string | string[] },
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
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
    send<R>(pattern: Pattern, options: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        reportProgress?: boolean, observe: 'events',
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
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
    send<R>(pattern: Pattern, options: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        reportProgress?: boolean, observe: 'events',
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
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
    send(pattern: Pattern, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
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
    send(pattern: Pattern, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
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
    send(pattern: Pattern, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
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
    send(pattern: Pattern, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
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
    send(pattern: Pattern, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    }): Observable<any> {
        if (isNil(pattern)) {
            return throwError(() => new InvalidMessageError());
        }
        return defer(async () => this.connect()).pipe(
            mergeMap(
                () => new Observable<TransportResponse>((observer) => {
                    const callback = this.createObserver(observer);
                    return this.publish(this.serializeRequest(pattern, options), callback);
                })
            ));
    }

    /**
     * emit message
     * @param pattern event pattern.
     * @param body event data.
     */
    emit<TInput = any>(pattern: Pattern, body: TInput): Observable<TransportResponse> {
        if (isNil(pattern) || isNil(body)) {
            return throwError(() => new InvalidMessageError());
        }
        const source = defer(async () => this.connect()).pipe(
            mergeMap(() => this.dispatchEvent(this.serializeRequest(pattern, body))),
        );
        const connectableSource = connectable(source, {
            connector: () => new Subject(),
            resetOnDisconnect: false,
        });
        connectableSource.connect();
        return connectableSource;
    }

    /**
     * publish handle.
     * @param ctx transport context.
     * @param callback 
     */
    protected abstract publish(
        req: TransportRequest,
        callback: (packet: TransportResponse) => void,
    ): () => void;

    /**
     * dispatch event.
     * @param packet 
     */
    protected abstract dispatchEvent<T = any>(packet: TransportResponse): Promise<T>;

    /**
     * create observer.
     * @param observer 
     * @returns 
     */
    protected createObserver(
        observer: Observer<TransportResponse>,
    ): (packet: TransportResponse) => void {
        return (response: TransportResponse) => {
            if (response.error) {
                return observer.error(this.serializeError(response.error));
            } else if (response.body !== undefined && response.disposed) {
                observer.next(this.serializeResponse(response));
                return observer.complete();
            } else if (response.disposed) {
                return observer.complete();
            }
            observer.next(this.serializeResponse(response));
        };
    }

    /**
     * close client.
     */
    abstract close(): Promise<void>;

    protected normalizePattern(pattern: Pattern): string {
        return stringify(pattern);
    }

    protected serializeError(err: any): TransportError {
        return err;
    }

    protected serializeRequest(pattern: Pattern, options?: {
        body?: any,
        method?: RequestMethod,
        headers?: { [header: string]: string | string[] },
        context?: TransportContext,
        params?: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean
    }): TransportRequest {
        return { pattern, ...options } as TransportRequest;
    }

    protected serializeResponse(response: any): TransportResponse {
        return response;
    }

    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}

/**
 * client option.
 */
export interface ClientOption extends Record<string, any> {
    /**
     * client url
     */
    url?: string;
    /**
     * transport type.
     */
    protocol: Protocol;
}

/**
 * client abstract factory.
 */
@Abstract()
export abstract class ClientFactory {
    /**
     * create by options.
     * @param options 
     */
    abstract create(options: ClientOption): TransportClient;
}

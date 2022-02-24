import { Abstract, isNil } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { connectable, defer, Observable, Observer, Subject, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { OnDispose } from '../../lifecycle';
import { InvalidMessageError, TransportError } from '../error';
import { Pattern, Protocol, ReadPacket, TransportEvent, WritePacket } from '../packet';
import { stringify } from '../context';
import { TransportHandler } from '../handler';
import { RequestMethod, TransportContext } from '..';


/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient implements OnDispose {

    @Logger()
    protected readonly logger!: ILogger;

    /**
     * transport protocol type.
     */
    abstract get protocol(): Protocol;
    /**
     * transport handler.
     */
    abstract get handler(): TransportHandler<ReadPacket, WritePacket>;

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
     * @param method  The HTTP method.
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
        responseType?: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<WritePacket<ArrayBuffer>>;
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
        responseType?: 'blob',
        withCredentials?: boolean,
    }): Observable<WritePacket<Blob>>;
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
                () => new Observable<WritePacket>((observer) => {
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
    emit<TInput = any>(pattern: Pattern, body: TInput): Observable<WritePacket> {
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
        req: ReadPacket,
        callback: (packet: WritePacket) => void,
    ): () => void;

    /**
     * dispatch event.
     * @param packet 
     */
    protected abstract dispatchEvent<T = any>(packet: WritePacket): Promise<T>;

    /**
     * create observer.
     * @param observer 
     * @returns 
     */
    protected createObserver(
        observer: Observer<WritePacket>,
    ): (packet: WritePacket) => void {
        return (response: WritePacket) => {
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
    }): ReadPacket {
        return { pattern, ...options } as ReadPacket;
    }

    protected serializeResponse(response: any): WritePacket {
        return response;
    }

    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}

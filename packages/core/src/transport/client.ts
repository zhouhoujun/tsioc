import { Abstract, ArgumentError, EMPTY_OBJ, InvocationContext, isNil, isString, type_str } from '@tsdi/ioc';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap, map } from 'rxjs';
import { RequestMethod, ResponsePacket, ResponseEvent } from './packet';
import { TransportOptions, TransportEndpoint } from './transport';
import { RequestContext } from './context';
import { ClientContext } from './client.ctx';



/**
 * client options.
 */
@Abstract()
export abstract class ClientOptions<TRequest, TResponse> extends TransportOptions<TRequest, TResponse> {

}


/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest = any, TResponse = any, TOption extends RequstOption = RequstOption> extends TransportEndpoint<TRequest, TResponse> {

    constructor(context: InvocationContext, options?: ClientOptions<TRequest, TResponse>) {
        super(context, options);
    }

    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected override initOption(options?: ClientOptions<TRequest, TResponse>): ClientOptions<TRequest, TResponse> {
        return options ?? {};
    }


    /**
     * Sends an `Request` and returns a stream of `TResponse`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `TResponse`s.
     */
    send(req: TRequest): Observable<TResponse>;
    /**
     * Constructs a request that interprets the body as an `ArrayBuffer` and returns the response in
     * an `ArrayBuffer`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    send(url: string, options: TOption & {
        observe?: 'body';
        responseType: 'arraybuffer';
    }): Observable<ArrayBuffer>;

    /**
     * Constructs a request that interprets the body as a blob and returns
     * the response as a blob.
     * 
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type `Blob`.
     */
    send(url: string, options: TOption & {
        observe?: 'body';
        responseType: 'blob';
    }): Observable<Blob>;

    /**
     * Constructs a request that interprets the body as a text string and
     * returns a string value.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    send(url: string, options: TOption & {
        observe?: 'body';
        responseType: 'text';
    }): Observable<string>;


    /**
     * Constructs a request that interprets the body as an `ArrayBuffer` and returns the
     * the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as an array of `HttpEvent`s for
     * the request.
     */
    send(url: string, options: TOption & {
        observe: 'events',
        responseType: 'arraybuffer',
    }): Observable<ResponseEvent<ArrayBuffer>>;

    /**
     * Constructs a request that interprets the body as a `Blob` and returns
     * the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type `Blob`.
     */
    send(url: string, options: TOption & {
        observe: 'events',
        responseType: 'blob',
    }): Observable<ResponseEvent<Blob>>;

    /**
     * Constructs a request which interprets the body as a text string and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type string.
     */
    send(url: string, options: TOption & {
        observe: 'events',
        responseType?: 'text',
    }): Observable<ResponseEvent<string>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the  request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type `Object`.
     */
    send(url: string, options: TOption & {
        observe: 'events',
        responseType?: 'json',
    }): Observable<ResponseEvent<any>>;

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
    send<R>(url: string, options: TOption & {
        observe: 'events',
        responseType?: 'json',
    }): Observable<ResponseEvent<R>>;

    /**
     * Constructs a request which interprets the body as an `ArrayBuffer`
     * and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body as an `ArrayBuffer`.
     */
    send(url: string, options: TOption & {
        observe: 'response';
        responseType: 'arraybuffer';
    }): Observable<ResponsePacket<ArrayBuffer>>;

    /**
     * Constructs a request which interprets the body as a `Blob` and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `Blob`.
     */
    send(url: string, options: TOption & {
        observe: 'response';
        responseType: 'blob';
    }): Observable<ResponsePacket<Blob>>;

    /**
     * Constructs a request which interprets the body as a text stream and returns the full
     * `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the send response, with the response body of type string.
     */
    send(url: string, options: TOption & {
        observe: 'response';
        responseType: 'text';
    }): Observable<ResponsePacket<string>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full
     * `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the full `HttpResponse`,
     * with the response body of type `Object`.
     */
    send(url: string, options: TOption & {
        observe: 'response';
        responseType?: 'json';
    }): Observable<ResponsePacket<object>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns
     * the full `HttpResponse` with the response body in the requested type.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return  An `Observable` of the full `HttpResponse`, with the response body of type `R`.
     */
    send<R>(url: string, options: TOption & {
        observe: 'response';
        responseType?: 'json';
    }): Observable<ResponsePacket<R>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full
     * `HttpResponse` as a JSON object.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `Object`.
     */
    send(url: string, options?: TOption & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<object>;

    /**
     * Constructs a request which interprets the body as a JSON object
     * with the response body of the requested type.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `R`.
     */
    send<R>(url: string, options?: TOption & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<R>;

    /**
     * Sends an `Request` and returns a stream of `TResponse`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `TResponse`s.
     */
    send(url: string, options: TOption & ResponseAs): Observable<TResponse>;
    /**
     * Constructs a request where response type and requested observable are not known statically.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the requested response, with body of type `any`.
     */
    send(req: TRequest | string, options?: any): Observable<any> {
        if (isNil(req)) {
            return throwError(() => new ArgumentError('Invalid message'))
        }
        let ctx: RequestContext;
        return defer(() => this.connect()).pipe(
            catchError((err, caught) => {
                return throwError(() => this.onError(err))
            }),
            mergeMap(() => {
                ctx = this.createContext(req, options);
                return this.request(ctx, req, options)
            }),
            finalize(() => {
                ctx?.destroy()
            })
        )
    }

    protected request(context: RequestContext, first: TRequest | string, options: TOption = EMPTY_OBJ as any): Observable<any> {
        const req = this.buildRequest(context, first, options);

        // Start with an Observable.of() the initial request, and run the handler (which
        // includes all interceptors) inside a concatMap(). This way, the handler runs
        // inside an Observable chain, which causes interceptors to be re-run on every
        // subscription (this also makes retries re-run the handler, including interceptors).
        const events$: Observable<TResponse> =
            of(req).pipe(concatMap((req: TRequest) => this.endpoint().handle(req, context)));

        // If coming via the API signature which accepts a previously constructed HttpRequest,
        // the only option is to get the event stream. Otherwise, return the event stream if
        // that is what was requested.
        if (context.observe === 'events') {
            return events$
        }

        // The requested stream contains either the full response or the body. In either
        // case, the first step is to filter the event stream to extract a stream of
        // responses(s).
        const res$: Observable<any> = events$;
        if ((req as ResponseAs).responseType) {
            context.responseType = (req as ResponseAs).responseType!
        }
        // Decide which stream to return.
        switch (context.observe || 'body') {
            case 'body':
                // The requested stream is the body. Map the response stream to the response
                // body. This could be done more simply, but a misbehaving interceptor might
                // transform the response body into a different format and ignore the requested
                // responseType. Guard against this by validating that the response is of the
                // requested type.
                switch (context.responseType) {
                    case 'arraybuffer':
                        return res$.pipe(map((res: ResponsePacket) => {
                            // Validate that the body is an ArrayBuffer.
                            if (res.body !== null && !(res.body instanceof ArrayBuffer)) {
                                throw new Error('Response is not an ArrayBuffer.')
                            }
                            return res.body
                        }));
                    case 'blob':
                        return res$.pipe(map((res: ResponsePacket) => {
                            // Validate that the body is a Blob.
                            if (res.body !== null && !(res.body instanceof Blob)) {
                                throw new Error('Response is not a Blob.')
                            }
                            return res.body
                        }));
                    case 'text':
                        return res$.pipe(map((res: ResponsePacket) => {
                            // Validate that the body is a string.
                            if (res.body !== null && typeof res.body !== type_str) {
                                throw new Error('Response is not a string.')
                            }
                            return res.body
                        }));
                    case 'json':
                    default:
                        // No validation needed for JSON responses, as they can be of any type.
                        return res$.pipe(map((res: ResponsePacket) => res.body))
                }
            case 'response':
                // The response stream was requested directly, so return it.
                return res$
            default:
                // Guard against new future observe types being added.
                throw new Error(`Unreachable: unhandled observe type ${context.observe}}`)
        }
    }

    protected onError(err: Error): Error {
        this.logger.error(err);
        return err;
    }

    protected createContext(req: TRequest | string, options?: TOption & ResponseAs): RequestContext {
        return (options as any)?.context ?? new ClientContext(
            this.context.injector, this as any,
            { parent: this.context, responseType: options?.responseType, observe: isString(req) ? options?.observe : 'events' });
    }

    protected abstract buildRequest(context: RequestContext, url: TRequest | string, options?: TOption): TRequest;

    protected abstract connect(): Promise<void>;

}


/**
 * request option.
 */
export interface RequstOption {
    method?: RequestMethod;
    body?: any;
    headers?: Record<string, any>;
    context?: InvocationContext;
    params?: Record<string, any>;
}


/**
 * response option for request.
 */
export interface ResponseAs {
    /**
     * response observe type
     */
    observe?: 'body' | 'events' | 'response';
    /**
     * response data type.
     */
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
}

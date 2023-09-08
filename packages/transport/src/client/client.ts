import { Abstract, ArgumentExecption, EMPTY_OBJ, Execption, InvocationContext, createContext, isNil, isString, tokenId } from '@tsdi/ioc';
import { ReqHeaders, TransportParams, RequestOptions, ResponseAs, RequestInitOpts, TransportRequest, Pattern, TransportEvent, TransportResponse} from '@tsdi/common';
import { Filter, CanActivate, Interceptor, ConfigableHandler, Shutdown } from '@tsdi/core';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap, map, isObservable } from 'rxjs';

/**
 *  event multicaster interceptors multi token.
 */
export const CLIENT_INTERCEPTORS = tokenId<Interceptor[]>('CLIENT_INTERCEPTORS');

/**
 *  event multicaster filters multi token.
 */
export const CLIENT_FILTERS = tokenId<Filter[]>('CLIENT_FILTERS');

/**
 *  event multicaster guards multi token.
 */
export const CLIENT_GUARDS = tokenId<CanActivate[]>('CLIENT_GUARDS');


/**
 * abstract client.
 */
@Abstract()
export abstract class Client<TRequest extends TransportRequest = TransportRequest, TStatus = number> {

    /**
     * client handler
     */
    abstract get handler(): ConfigableHandler<TRequest, TransportEvent<TStatus>>

    /**
     * Sends an `Request` and returns a stream of `TransportEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `TransportEvent`s.
     */
    send(req: TRequest): Observable<TransportEvent<TStatus>>;

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
    send(url: Pattern, options: RequestOptions & {
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
    send(url: Pattern, options: RequestOptions & {
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
    send(url: Pattern, options: RequestOptions & {
        observe?: 'body';
        responseType: 'text';
    }): Observable<string>;

    /**
     * Constructs a request that interprets the body as an `ArrayBuffer` and returns the
     * the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as an array of `TransportEvent`s for
     * the request.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType: 'arraybuffer',
    }): Observable<TransportEvent<ArrayBuffer, TStatus>>;

    /**
     * Constructs a request that interprets the body as a `Blob` and returns
     * the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of all `TransportEvent`s for the request,
     * with the response body of type `Blob`.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType: 'blob',
    }): Observable<TransportEvent<Blob, TStatus>>;

    /**
     * Constructs a request which interprets the body as a text string and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of all `TransportEvent`s for the request,
     * with the response body of type string.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType?: 'text',
    }): Observable<TransportEvent<string, TStatus>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The Transport options to send with the  request.
     *
     * @return An `Observable` of all `TransportEvent`s for the request,
     * with the response body of type `Object`.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType?: 'json',
    }): Observable<TransportEvent<any, TStatus>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of all `TransportEvent`s for the request,
     * with the response body of type `R`.
     */
    send<R>(url: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType?: 'json',
    }): Observable<TransportEvent<R, TStatus>>;


    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The Transport options to send with the  request.
     *
     * @return An `Observable` of all `TransportEvent`s for the request,
     * with the response body of type `Object`.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'emit',
    }): Observable<TransportEvent<any, TStatus>>;

    /**
     * Constructs a request which interprets the body as an `ArrayBuffer`
     * and returns the full `TransportResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `TransportResponse`, with the response body as an `ArrayBuffer`.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType: 'arraybuffer';
    }): Observable<TransportResponse<ArrayBuffer, TStatus>>;

    /**
     * Constructs a request which interprets the body as a `Blob` and returns the full `TransportResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `TransportResponse`, with the response body of type `Blob`.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType: 'blob';
    }): Observable<TransportResponse<Blob, TStatus>>;

    /**
     * Constructs a request which interprets the body as a text stream and returns the full
     * `TransportResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the send response, with the response body of type string.
     */
    send(url: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType: 'text';
    }): Observable<TransportResponse<string, TStatus>>;


    /**
     * Constructs a request which interprets the body as a JSON object and returns
     * the full `TransportResponse` with the response body in the requested type.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return  An `Observable` of the full `TransportResponse`, with the response body of type `R`.
     */
    send<R = any>(url: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType?: 'json';
    }): Observable<TransportResponse<R, TStatus>>;


    /**
     * Constructs a request which interprets the body as a JSON object
     * with the response body of the requested type.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `TransportResponse`, with the response body of type `R`.
     */
    send<R = any>(url: Pattern, options?: RequestOptions & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<R>;

    /**
     * Sends an `Request` and returns a stream of `TransportEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `TransportEvent`s.
     */
    send(url: Pattern, options: RequestOptions & ResponseAs): Observable<TransportEvent>;
    /**
     * Constructs a request where response type and requested observable are not known statically.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the requested response, with body of type `any`.
     */
    send(req: TRequest | Pattern, options?: RequestOptions & ResponseAs): Observable<any> {
        if (isNil(req)) {
            return throwError(() => new ArgumentExecption('Invalid message'))
        }
        const connecting = this.connect();
        return (isObservable(connecting) ? connecting : defer(() => connecting))
            .pipe(
                catchError((err, caught) => {
                    return throwError(() => this.onError(err))
                }),
                mergeMap(() => {
                    return this.request(req, options)
                })
            )
    }

    protected request(first: Pattern | TRequest, options: RequestOptions = EMPTY_OBJ as any): Observable<any> {
        const req = this.buildRequest(first, options);

        // Start with an Observable.of() the initial request, and run the handler (which
        // includes all interceptors) inside a concatMap(). This way, the handler runs
        // inside an Observable chain, which causes interceptors to be re-run on every
        // subscription (this also makes retries re-run the handler, including interceptors).
        const events$: Observable<TransportEvent> =
            of(req).pipe(
                concatMap((req: TRequest) => this.handler.handle(req)),
                finalize(() => req.context?.destroy())
            );

        // If coming via the API signature which accepts a previously constructed HttpRequest,
        // the only option is to get the event stream. Otherwise, return the event stream if
        // that is what was requested.
        if (req.observe === 'events') {
            return events$
        }

        // The requested stream contains either the full response or the body. In either
        // case, the first step is to filter the event stream to extract a stream of
        // responses(s).
        const res$: Observable<any> = events$;
        // Decide which stream to return.
        switch (req.observe || 'body') {
            case 'body':
                // The requested stream is the body. Map the response stream to the response
                // body. This could be done more simply, but a misbehaving interceptor might
                // transform the response body into a different format and ignore the requested
                // responseType. Guard against this by validating that the response is of the
                // requested type.
                switch (req.responseType) {
                    case 'arraybuffer':
                        return res$.pipe(map((res: TransportResponse) => {
                            // Validate that the body is an ArrayBuffer.
                            if (res.body !== null && !(res.body instanceof ArrayBuffer)) {
                                throw new Execption('Response is not an ArrayBuffer.')
                            }
                            return res.body
                        }));
                    case 'blob':
                        return res$.pipe(map((res: TransportResponse) => {
                            // Validate that the body is a Blob.
                            if (res.body !== null && !(res.body instanceof Blob)) {
                                throw new Execption('Response is not a Blob.')
                            }
                            return res.body
                        }));
                    case 'text':
                        return res$.pipe(map((res: TransportResponse) => {
                            // Validate that the body is a string.
                            if (res.body !== null && !isString(res.body)) {
                                throw new Execption('Response is not a string.')
                            }
                            return res.body
                        }));
                    case 'json':
                    default:
                        // No validation needed for JSON responses, as they can be of any type.
                        return res$.pipe(map((res: TransportResponse) => res.body))
                }
            case 'response':
                // The response stream was requested directly, so return it.
                return res$
            default:
                // Guard against new future observe types being added.
                throw new Execption(`Unreachable: unhandled observe type ${req.observe}}`)
        }
    }

    protected onError(err: Error): Error {
        return err;
    }

    /**
     * build request.
     * @param first 
     * @param options 
     */
    protected buildRequest(first: TRequest | Pattern, options: RequestOptions & ResponseAs = {}): TRequest {
        let req: TRequest;
        // First, check whether the primary argument is an instance of `TRequest`.
        if (this.isRequest(first)) {
            // It is. The other arguments must be undefined (per the signatures) and can be
            // ignored.
            req = first
        } else {
            // const method = first as string;
            // Figure out the headers.
            let headers: ReqHeaders | undefined = undefined;
            if (options.headers instanceof ReqHeaders) {
                headers = options.headers
            } else {
                headers = new ReqHeaders(options.headers)
            }

            // Sort out parameters.
            let params: TransportParams | undefined = undefined;
            if (options.params) {
                if (options.params instanceof TransportParams) {
                    params = options.params
                } else {
                    params = this.createParams(options.params)
                }
            }

            const context = options.context || createContext(this.handler.injector);
            this.initContext(context);
            // Construct the request.
            req = this.createRequest(first, {
                ...options,
                headers,
                params,
                body: options.body ?? options.payload ?? null,
                context,
                // By default, JSON is assumed to be returned for all calls.
                responseType: options.responseType || 'json'
            })
        }
        return req;
    }

    @Shutdown()
    close(): Promise<void> {
        return this.onShutdown();
    }


    protected isRequest(target: any): target is TRequest {
        return target instanceof TransportRequest
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts): TRequest {
        return new TransportRequest(pattern, options) as TRequest;
    }

    protected createParams(params: string | ReadonlyArray<[string, string | number | boolean]>
        | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>) {
        return new TransportParams({ params })
    }

    /**
     * connect service.
     */
    protected abstract connect(): Promise<any> | Observable<any>;
    /**
     * init request context.
     * @param context 
     */
    protected abstract initContext(context: InvocationContext): void;

    protected abstract onShutdown(): Promise<void>;

}


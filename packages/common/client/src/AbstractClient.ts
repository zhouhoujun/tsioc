import { Abstract, ArgumentExecption, EMPTY_OBJ, Execption, InvocationContext, createContext, isNil, isString } from '@tsdi/ioc';
import { Shutdown } from '@tsdi/core';
import { HeaderMappings, RequestParams, ResponseAs, Pattern, ResponseEvent, RequestInitOpts, RequestOptions, AbstractRequest, Response, PatternFormatter } from '@tsdi/common';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap, map } from 'rxjs';
import { ClientHandler } from './handler';
import { ClientOpts } from './options';



/**
 * abstract client. use to request text, stream, blob, arraybuffer and json.
 */
@Abstract()
export abstract class AbstractClient<TRequest extends AbstractRequest<any> = AbstractRequest<any>, TResponse extends ResponseEvent<any> = ResponseEvent<any>, TOptions extends ClientOpts = ClientOpts> {

    /**
     * client handler
     */
    abstract get handler(): ClientHandler<TRequest, TResponse, TOptions>;

    private _formatter?: PatternFormatter;
    get formatter(): PatternFormatter {
        if(!this._formatter){
            this._formatter = this.handler.injector.get(PatternFormatter);
        }
        return this._formatter;
    }

    getOptions(): TOptions {
        return this.handler.getOptions()
    }

    /**
     * Sends an `Request` and returns a stream of `ResponseEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `ResponseEvent`s.
     */
    send(req: TRequest): Observable<TResponse>;

    /**
     * Constructs a request that interprets the body as an `ArrayBuffer` and returns the response in
     * an `ArrayBuffer`.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe?: 'body';
        responseType: 'arraybuffer';
    }): Observable<ArrayBuffer>;

    /**
     * Constructs a request that interprets the body as a blob and returns
     * the response as a blob.
     * 
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type `Blob`.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe?: 'body';
        responseType: 'blob';
    }): Observable<Blob>;

    /**
     * Constructs a request that interprets the body as a text string and
     * returns a string value.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe?: 'body';
        responseType: 'text';
    }): Observable<string>;

    /**
     * Constructs a request that interprets the body as an `ArrayBuffer` and returns the
     * the full event stream.
     *
     * @param pattern     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as an array of `ResponseEvent`s for
     * the request.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType: 'arraybuffer',
    }): Observable<ResponseEvent<ArrayBuffer>>;

    /**
     * Constructs a request that interprets the body as a `Blob` and returns
     * the full event stream.
     *
     * @param pattern     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of all `ResponseEvent`s for the request,
     * with the response body of type `Blob`.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType: 'blob',
    }): Observable<ResponseEvent<Blob>>;

    /**
     * Constructs a request which interprets the body as a text string and returns the full event
     * stream.
     *
     * @param pattern     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of all `ResponseEvent`s for the request,
     * with the response body of type string.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType?: 'text',
    }): Observable<ResponseEvent<string>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param pattern     The endpoint URL.
     * @param options The Transport options to send with the  request.
     *
     * @return An `Observable` of all `ResponseEvent`s for the request,
     * with the response body of type `Object`.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType?: 'json',
    }): Observable<ResponseEvent<any>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param pattern     The endpoint URL.
     * @param options The Transport options to send with the request.
     *
     * @return An `Observable` of all `ResponseEvent`s for the request,
     * with the response body of type `R`.
     */
    send<R>(pattern: Pattern, options: RequestOptions & {
        observe: 'events',
        responseType?: 'json',
    }): Observable<ResponseEvent<R>>;


    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param pattern     The endpoint URL.
     * @param options The Transport options to send with the  request.
     *
     * @return An `Observable` of all `ResponseEvent`s for the request,
     * with the response body of type `Object`.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'emit',
    }): Observable<ResponseEvent<any>>;

    /**
     * Constructs a request which interprets the body as an `ArrayBuffer`
     * and returns the full `ResponsePacket`.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `ResponsePacket`, with the response body as an `ArrayBuffer`.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType: 'arraybuffer';
    }): Observable<Response<ArrayBuffer>>;

    /**
     * Constructs a request which interprets the body as a `Blob` and returns the full `ResponsePacket`.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `ResponsePacket`, with the response body of type `Blob`.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType: 'blob';
    }): Observable<Response<Blob>>;

    /**
     * Constructs a request which interprets the body as a text stream and returns the full
     * `ResponsePacket`.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the send response, with the response body of type string.
     */
    send(pattern: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType: 'text';
    }): Observable<Response<string>>;


    /**
     * Constructs a request which interprets the body as a JSON object and returns
     * the full `ResponsePacket` with the response body in the requested type.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return  An `Observable` of the full `ResponsePacket`, with the response body of type `R`.
     */
    send<R = any>(pattern: Pattern, options: RequestOptions & {
        observe: 'response';
        responseType?: 'json';
    }): Observable<Response<R>>;


    /**
     * Constructs a request which interprets the body as a JSON object
     * with the response body of the requested type.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `ResponsePacket`, with the response body of type `R`.
     */
    send<R = any>(pattern: Pattern, options?: RequestOptions & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<R>;

    /**
     * Sends an `Request` and returns a stream of `ResponseEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `ResponseEvent`s.
     */
    send(pattern: Pattern, options: RequestOptions & ResponseAs): Observable<ResponseEvent<any>>;
    /**
     * Constructs a request where response type and requested observable are not known statically.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the requested response, with body of type `any`.
     */
    send(req: TRequest | Pattern, options?: RequestOptions & ResponseAs): Observable<any> {
        if (isNil(req)) {
            return throwError(() => new ArgumentExecption('Invalid message'))
        }
        return defer(() => this.handler.ready)
            .pipe(
                mergeMap(() => this.connect()),
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
        const events$: Observable<ResponseEvent<any>> =
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
                        return res$.pipe(map((res: Response<any>) => {
                            // Validate that the body is an ArrayBuffer.
                            if (res.body !== null && !(res.body instanceof ArrayBuffer)) {
                                throw new Execption('Response is not an ArrayBuffer.')
                            }
                            return res.body
                        }));
                    case 'blob':
                        return res$.pipe(map((res: Response<any>) => {
                            // Validate that the body is a Blob.
                            if (res.body !== null && !(res.body instanceof Blob)) {
                                throw new Execption('Response is not a Blob.')
                            }
                            return res.body
                        }));
                    case 'text':
                        return res$.pipe(map((res: Response<any>) => {
                            // Validate that the payload is a string.
                            if (res.body !== null && !isString(res.body)) {
                                throw new Execption('Response is not a string.')
                            }
                            return res.body
                        }));
                    case 'json':
                    default:
                        // No validation needed for JSON responses, as they can be of any type.
                        return res$.pipe(map((res: Response<any>) => res.body))
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
            let headers: HeaderMappings | undefined = undefined;
            if (options.headers instanceof HeaderMappings) {
                headers = options.headers
            } else {
                headers = new HeaderMappings(options.headers)
            }

            // Sort out parameters.
            let params: RequestParams | undefined = undefined;
            if (options.params) {
                if (options.params instanceof RequestParams) {
                    params = options.params
                } else {
                    params = this.createParams(options.params)
                }
            }

            const context = options.context || createContext(this.handler.injector);
            this.initContext(context);
            // Construct the request.
            req = this.createRequest(first, {
                context,
                ...options,
                headers,
                params,
                payload: options.payload ?? null,
                // By default, JSON is assumed to be returned for all calls.
                responseType: options.responseType || 'json'
            })
        }
        return req;
    }

    @Shutdown()
    close(): Promise<void> {
        this.handler.onDestroy();
        return this.onShutdown();
    }


    protected isRequest(target: any): target is TRequest {
        return target instanceof AbstractRequest;
    }

    protected abstract createRequest(pattern: Pattern, options: RequestInitOpts): TRequest;

    protected createParams(params: string | ReadonlyArray<[string, string | number | boolean]>
        | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>) {
        return new RequestParams({ params })
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


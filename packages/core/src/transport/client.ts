import { Abstract, ArgumentError, EMPTY, EMPTY_OBJ, InvocationContext, isFunction, isNil, isNumber, Token, type_str } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap, filter, map } from 'rxjs';
import { EndpointContext } from './context';
import { InterceptorChain, Endpoint, EndpointBackend, InterceptorInst, InterceptorType } from './endpoint';
import { ClientContext } from './client.ctx';
import { RequestBase, ResponseBase, ResponseEvent } from './packet';


/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest extends RequestBase = RequestBase, TResponse = any, TOption extends RequstOption = RequstOption> {

    @Log()
    readonly logger!: Logger;

    private _chain?: Endpoint<TRequest, TResponse>;
    private _interceptors?: InterceptorInst<TRequest, TResponse>[];


    /**
     * initialize interceptors with options.
     * @param options 
     */
    protected initialize(options: ClientOptions<TRequest, TResponse>) {

        if (options.interceptors && options.interceptors.length) {
            const iToken = this.getInterceptorsToken();
            const interceptors = options.interceptors.map(m => {
                if (isFunction(m)) {
                    return { provide: iToken, useClass: m, multi: true }
                } else {
                    return { provide: iToken, useValue: m, multi: true }
                }
            });
            this.context.injector.inject(interceptors);
        }
    }

    protected abstract getInterceptorsToken(): Token<InterceptorInst<TRequest, TResponse>[]>;

    /**
     * client context.
     */
    abstract get context(): InvocationContext;

    /**
     * client interceptors.
     */
    get interceptors(): InterceptorInst<TRequest, TResponse>[] {
        if (!this._interceptors) {
            this._interceptors = [...this.context.injector.get(this.getInterceptorsToken(), EMPTY)]
        }
        return this._interceptors
    }

    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    use(interceptor: InterceptorInst<TRequest, TResponse>, order?: number): this {
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, interceptor)
        } else {
            this.interceptors.push(interceptor)
        }
        this._chain = null!;
        return this
    }

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(this.getBackend(), this.interceptors)
        }
        return this._chain
    }


    /**
     * Sends an `Request` and returns a stream of `TResponse`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `TResponse`s.
     */
    send(url: string, options?: TOption & ResponseOption): Observable<TResponse>;
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
        observe?: 'response';
        responseType: 'arraybuffer';
    }): Observable<RequestBase<ArrayBuffer>>;

    /**
     * Constructs a request which interprets the body as a `Blob` and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `Blob`.
     */
    send(method: string, url: string, options: TOption & {
        observe?: 'response';
        responseType: 'blob';
    }): Observable<RequestBase<Blob>>;

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
        observe?: 'response';
        responseType: 'text';
    }): Observable<RequestBase<string>>;

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
        observe?: 'response';
        responseType?: 'json';
    }): Observable<RequestBase<object>>;

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
        observe?: 'response';
        responseType?: 'json';
    }): Observable<RequestBase<R>>;

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
        let ctx: EndpointContext;
        return defer(() => this.connect()).pipe(
            catchError((err, caught) => {
                return throwError(() => this.onError(err))
            }),
            mergeMap(() => {
                ctx = this.createContext(options);
                return this.request(ctx, req, options)
            }),
            finalize(() => {
                ctx?.destroy()
            })
        )
    }

    protected request(context: EndpointContext, first: TRequest | string, options: TOption & ResponseOption = EMPTY_OBJ as any): Observable<any> {
        const req = this.buildRequest(first, options);

        // Start with an Observable.of() the initial request, and run the handler (which
        // includes all interceptors) inside a concatMap(). This way, the handler runs
        // inside an Observable chain, which causes interceptors to be re-run on every
        // subscription (this also makes retries re-run the handler, including interceptors).
        const events$: Observable<TResponse> =
            of(req).pipe(concatMap((req: TRequest) => this.chain().handle(req, context)));

        // If coming via the API signature which accepts a previously constructed HttpRequest,
        // the only option is to get the event stream. Otherwise, return the event stream if
        // that is what was requested.
        if (first instanceof RequestBase || options.observe === 'events') {
            return events$
        }

        // The requested stream contains either the full response or the body. In either
        // case, the first step is to filter the event stream to extract a stream of
        // responses(s).
        const res$: Observable<any> = events$.pipe(filter(event => this.isResponse(event)));

        // Decide which stream to return.
        switch (options.observe || 'body') {
            case 'body':
                // The requested stream is the body. Map the response stream to the response
                // body. This could be done more simply, but a misbehaving interceptor might
                // transform the response body into a different format and ignore the requested
                // responseType. Guard against this by validating that the response is of the
                // requested type.
                switch (req.responseType) {
                    case 'arraybuffer':
                        return res$.pipe(map((res: ResponseBase) => {
                            // Validate that the body is an ArrayBuffer.
                            if (res.body !== null && !(res.body instanceof ArrayBuffer)) {
                                throw new Error('Response is not an ArrayBuffer.')
                            }
                            return res.body
                        }));
                    case 'blob':
                        return res$.pipe(map((res: ResponseBase<any>) => {
                            // Validate that the body is a Blob.
                            if (res.body !== null && !(res.body instanceof Blob)) {
                                throw new Error('Response is not a Blob.')
                            }
                            return res.body
                        }));
                    case 'text':
                        return res$.pipe(map((res: ResponseBase<any>) => {
                            // Validate that the body is a string.
                            if (res.body !== null && typeof res.body !== type_str) {
                                throw new Error('Response is not a string.')
                            }
                            return res.body
                        }));
                    case 'json':
                    default:
                        // No validation needed for JSON responses, as they can be of any type.
                        return res$.pipe(map((res: ResponseBase<any>) => res.body))
                }
            case 'response':
                // The response stream was requested directly, so return it.
                return res$
            default:
                // Guard against new future observe types being added.
                throw new Error(`Unreachable: unhandled observe type ${options.observe}}`)
        }
    }

    protected isResponse(response: any): boolean {
        return response instanceof ResponseBase;
    }

    protected onError(err: Error): Error {
        return err;
    }

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;

    protected createContext(options?: TOption): EndpointContext {
        return (options as any)?.context ?? new ClientContext(this.context.injector, this as any, { parent: this.context });
    }

    protected abstract buildRequest(url: TRequest | string, options?: TOption): TRequest;

    protected abstract connect(): Promise<void>;

}


/**
 * client options.
 */
export interface ClientOptions<TRequest, TResponse> {
    interceptors?: InterceptorType<TRequest, TResponse>[];
}

/**
 * request option.
 */
export interface RequstOption {
    method?: string;
    body?: any;
    headers?: Record<string, any>;
    context?: InvocationContext;
    params?: Record<string, any>;
}

/**
 * response option for request.
 */
export interface ResponseOption {
    observe?: 'body' | 'events' | 'response';
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
}

import { Abstract, ArgumentException, Exception, Context, isNil, isString, Injector, Optional, Inject } from '@tsdi/ioc';
import { Shutdown } from '@tsdi/core';
import { HeaderMappings, RequestParams, ResponseAs, Pattern, ResponseEvent, RequestInitOpts, RequestOptions, AbstractRequest, Response, createRequestContext, RequestContext, PAYLOAD_KEY, StreamAdapter, REQUEST, Incoming } from '@tsdi/common';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap, map, timeout as timeoutOperator } from 'rxjs';
import { ClientHandler } from './handler';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY } from './strategies/IClientTransportStrategy';
import { IBodySerializeStrategy, BODY_SERIALIZE_STRATEGY } from './strategies/IBodySerializeStrategy';
import { ITimeoutStrategy, TIMEOUT_STRATEGY, DEFAULT_TIMEOUT } from './strategies/ITimeoutStrategy';

/**
 * abstract client. use to request text, stream, blob, arraybuffer and json.
 * 抽象客户端，用于请求文本、流、blob、arraybuffer和json
 */
@Abstract()
export abstract class AbstractClient<
    TRequest extends AbstractRequest<any> = AbstractRequest<any>,
    TResponse extends ResponseEvent<any> = ResponseEvent<any>,
    TReqOptions extends RequestOptions = RequestOptions
> {

    protected get injector(): Injector {
        return this.handler.injector;
    }
    
    /**
     * client handler
     * 客户端处理器
     */
    protected abstract get handler(): ClientHandler<TRequest, TResponse>;

    /**
     * Optional transport strategy for protocol-specific operations.
     * 可选的传输策略，用于协议特定的操作
     */
    protected get transportStrategy(): IClientTransportStrategy<TRequest, TResponse, any> | null {
        return this.injector.get(CLIENT_TRANSPORT_STRATEGY, null);
    }

    /**
     * Optional body serialize strategy.
     * 可选的请求体序列化策略
     */
    protected get bodySerializeStrategy(): IBodySerializeStrategy | null {
        return this.injector.get(BODY_SERIALIZE_STRATEGY, null);
    }

    /**
     * Optional timeout strategy.
     * 可选的超时策略
     */
    protected get timeoutStrategy(): ITimeoutStrategy | null {
        return this.injector.get(TIMEOUT_STRATEGY, null);
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send<R>(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send(pattern: Pattern, options: TReqOptions & {
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
    send<R = any>(pattern: Pattern, options: TReqOptions & {
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
    send<R = any>(pattern: Pattern, options?: TReqOptions & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<R>;

    /**
     * Sends an `Request` and returns a stream of `ResponseEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `ResponseEvent`s.
     */
    send(pattern: Pattern, options: TReqOptions & ResponseAs): Observable<ResponseEvent<any>>;
    /**
     * Constructs a request where response type and requested observable are not known statically.
     *
     * @param pattern     The endpoint URL.
     * @param options The send options to send with the request.
     *
     * @return An `Observable` of the requested response, with body of type `any`.
     */
    send(req: TRequest | Pattern, options?: TReqOptions & ResponseAs): Observable<any> {
        if (isNil(req)) {
            return throwError(() => new ArgumentException('Invalid message'))
        }
        return defer(() => this.injector.ready)
            .pipe(
                mergeMap(() => this.strategyConnect()),
                catchError((err, caught) => {
                    return throwError(() => this.strategyHandleError(err))
                }),
                mergeMap(() => {
                    return this.request(req, options)
                }),
                this.strategyApplyTimeout()
            )
    }

    /**
     * Connect using strategy if available, otherwise use legacy connect.
     * 使用策略连接（如果可用），否则使用传统连接
     */
    protected strategyConnect(): Promise<any> | Observable<any> {
        const strategy = this.transportStrategy;
        if (strategy) {
            return strategy.connect();
        }
        return this.connect();
    }

    /**
     * Handle error using strategy if available.
     * 使用策略处理错误（如果可用）
     */
    protected strategyHandleError(err: Error): Error {
        const strategy = this.timeoutStrategy;
        if (strategy && err.name === 'TimeoutError') {
            const context = createRequestContext(this.injector);
            return strategy.handleTimeout(err, context);
        }
        return this.onError(err);
    }

    /**
     * Apply timeout using strategy if available.
     * 使用策略应用超时（如果可用）
     */
    protected strategyApplyTimeout<T>() {
        const strategy = this.timeoutStrategy;
        if (strategy && strategy.shouldApplyTimeout(createRequestContext(this.injector))) {
            return timeoutOperator(strategy.getTimeout());
        }
        return <T>(source: Observable<T>) => source;
    }

    protected request(first: Pattern | TRequest, options: TReqOptions = {} as any): Observable<any> {
        const req = this.buildRequest(first, options);
        let context = options.context;
        if (!context) {
            context = this.createContext();
            context.set(REQUEST, req as any);
            this.strategyInitContext(context, req);
        }
        const events$: Observable<ResponseEvent<any>> =
            of(req).pipe(
                concatMap((req: TRequest) => this.handler.handle(req, context)),
                finalize(() => context.onDestroy())
            );

        if (req.observe === 'events') {
            return events$
        }

        const res$: Observable<any> = events$;
        switch (req.observe || 'body') {
            case 'body':
                switch (req.responseType) {
                    case 'arraybuffer':
                        return res$.pipe(map((res: Response<any>) => {
                            if (res.body !== null && !(res.body instanceof ArrayBuffer)) {
                                throw new Exception('Response is not an ArrayBuffer.')
                            }
                            return res.body
                        }));
                    case 'blob':
                        return res$.pipe(map((res: Response<any>) => {
                            if (res.body !== null && !(res.body instanceof Blob)) {
                                throw new Exception('Response is not a Blob.')
                            }
                            return res.body
                        }));
                    case 'stream':
                        return res$.pipe(map((res: Response<any>) => {
                            if (res.body !== null && !(this.injector.get(StreamAdapter).isReadable(res.body))) {
                                throw new Exception('Response is not a ReadableStream.')
                            }
                            return res.body
                        }));
                    case 'text':
                        return res$.pipe(map((res: Response<any>) => {
                            if (res.body !== null && !isString(res.body)) {
                                throw new Exception('Response is not a string.')
                            }
                            return res.body
                        }));
                    case 'json':
                    default:
                        return res$.pipe(map((res: Response<any>) => res.body))
                }
            case 'response':
                return res$
            default:
                throw new Exception(`Unreachable: unhandled observe type ${req.observe}}`)
        }
    }

    protected createContext(): RequestContext {
        const context = createRequestContext(this.injector);
        return context;
    }

    protected onError(err: Error): Error {
        return err;
    }

    /**
     * Initialize context using strategy if available, otherwise use legacy initContext.
     * 使用策略初始化上下文（如果可用），否则使用传统初始化
     */
    protected strategyInitContext(context: RequestContext, req: TRequest): void {
        const strategy = this.transportStrategy;
        if (strategy) {
            strategy.initContext(context as any, req);
        } else {
            this.initContext(context as any, req);
        }
    }

    /**
     * build request.
     * 构建请求
     * @param first 
     * @param options 
     */
    protected buildRequest(first: TRequest | Pattern, options: TReqOptions & ResponseAs = {} as any): TRequest {
        let req: TRequest;
        if (this.isRequest(first)) {
            req = first
        } else {
            let headers: HeaderMappings | undefined = undefined;
            if (options.headers instanceof HeaderMappings) {
                headers = options.headers
            } else {
                headers = new HeaderMappings(options.headers)
            }

            let params: RequestParams | undefined = undefined;
            if (options.params) {
                if (options.params instanceof RequestParams) {
                    params = options.params
                } else {
                    params = this.createParams(options.params)
                }
            }

            // Use strategy for request creation if available
            const strategy = this.transportStrategy;
            if (strategy) {
                req = strategy.createRequest(first, {
                    ...options,
                    headers,
                    params,
                    payload: options.payload ?? null,
                    responseType: options.responseType
                }) as TRequest;
            } else {
                req = this.createRequest(first, {
                    ...options,
                    headers,
                    params,
                    payload: options.payload ?? null,
                    responseType: options.responseType
                })
            }
        }
        return req;
    }

    /**
     * Serialize body using strategy if available.
     * 使用策略序列化请求体（如果可用）
     */
    protected strategySerializeBody(body: any): any {
        const strategy = this.bodySerializeStrategy;
        if (strategy) {
            const context = createRequestContext(this.injector);
            return strategy.serialize(body, context);
        }
        return body;
    }

    @Shutdown()
    close(): Promise<void> {
        this.injector.onDestroy();
        return this.strategyOnShutdown();
    }

    /**
     * Shutdown using strategy if available, otherwise use legacy onShutdown.
     * 使用策略关闭（如果可用），否则使用传统关闭
     */
    protected strategyOnShutdown(): Promise<void> {
        const strategy = this.transportStrategy;
        if (strategy) {
            return strategy.onShutdown();
        }
        return this.onShutdown();
    }


    protected isRequest(target: any): target is TRequest {
        return target instanceof AbstractRequest;
    }

    /**
     * Legacy create request method - override in concrete implementations.
     * 传统创建请求方法 - 在具体实现中覆盖
     */
    protected abstract createRequest(pattern: Pattern, options: RequestInitOpts<any, TReqOptions>): TRequest;

    protected createParams(params: string | ReadonlyArray<[string, string | number | boolean]>
        | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>) {
        return new RequestParams({ params })
    }

    /**
     * Legacy connect method - override in concrete implementations.
     * 传统连接方法 - 在具体实现中覆盖
     */
    protected abstract connect(): Promise<any> | Observable<any>;
    
    /**
     * Legacy init context method - override in concrete implementations.
     * 传统初始化上下文方法 - 在具体实现中覆盖
     * @param context 
     */
    protected abstract initContext(context: Context, req: TRequest): void;

    /**
     * Legacy shutdown method - override in concrete implementations.
     * 传统关闭方法 - 在具体实现中覆盖
     */
    protected abstract onShutdown(): Promise<void>;

}
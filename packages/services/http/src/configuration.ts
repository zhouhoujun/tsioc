import { Injectable, InjectFlags, isNil, isString, promisify, tokenId } from '@tsdi/ioc';
import { Bean, Configuration, ContextToken, ExecptionHandlerFilter } from '@tsdi/core';
import { Header, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    bodyDesrializeBackend,
    ClientIncoming, ctype, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory, ev,
    FileAdapter, Incoming, IncomingFactory, IReadable, MimeAdapter,
    Redirector, SerializerFactory, StatusAdapter, StreamAdapter, StreamIncomingOptions, TransportContext, UrlClientIncomingFactory,
    UrlClientIncomingOpts, UrlOutgoingFactory
} from '@tsdi/common/transport';
import {
    bodyServializeInterceptor,
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, requestBodySerializeBackend, STATUS_RESPONSE_TRANSFER_INTERCEPTORS, UrlRedirector
} from '@tsdi/common/client';
import { HttpRequest } from '@tsdi/common/http';
import {
    ExecptionFinalizeFilter, FinalizeFilter, SERVER_MODULES, ServerModuleOpts,
    MimeModule, ServiceModuleOpts, JsonInterceptor, BodyparserInterceptor, AcceptsPriority, ServerTransferFactory,
    DefaultServerTransferFactory, DefaultServerTransport, ServerTransport,
    HttpServConfig, LoggerFilter, emptyStatusSerializeInterceptor,
    headMethodSerializeInterceptor, noBodySerializeInterceptor, lengthLimitSerializeInterceptor,
    contextBodySerializeBackend, execptionMessageSerializeInterceptor
} from '@tsdi/endpoints';
import { request as httpRequest, IncomingMessage, ClientRequest, Server } from 'http';
import { request as httpsRequest, Server as HttpsServer } from 'https';
import {
    ClientHttp2Session, ClientHttp2Stream, constants, OutgoingHttpHeaders,
    ClientSessionRequestOptions, Http2Server
} from 'http2';
import { fromEvent, Observable, of } from 'rxjs';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS, HttpClientConfig } from './client/options';
import { HttpHandler } from './client/handler';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS } from './server/options';
import { HttpRequestHandler } from './server/handler';
import { HttpServer } from './server/server';
import { HttpStatusAdapter } from './status';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpExecptionHandlers } from './execption.handlers';
import { HttpContext, HttpServRequest, HttpServResponse } from './server/context';



@Configuration()
export class HttpConfiguration {


    @Bean(CLIENT_MODULES, { static: true, multi: true })
    client(): ClientModuleOpts {
        return this.getClientOptions();
    }


    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions() as ServerModuleOpts;
        option.defaultConfig!.middlewaresToken = HTTP_MIDDLEWARES,
            option.defaultConfig!.content = {
                root: 'public'
            };
        return option;
    }


    private getClientOptions(): ClientModuleOpts {
        return {
            transport: 'http',
            clientType: Http,
            imports: [
                MimeModule,
            ],
            defaultConfig: {
                handlerType: HttpHandler,
                interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                filtersToken: HTTP_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                return new DefaultClientTransport<ClientHttp2Session | null, HttpRequest<any>, Buffer | string | IReadable>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestBodySerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: bodyDesrializeBackend,
                                        ...options.deserializerConfig
                                    }),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, options.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (socket: ClientHttp2Session | null, factory, instance) => {
                                        const context =  instance ?? factory();
                                        const channel = context.get(REQUEST_STREAM);
                                        if (channel instanceof ClientRequest) {
                                            return new Observable<ClientIncoming>(subscribe => {
                                                const onResponse = (resp: IncomingMessage) => {
                                                    (resp as ClientIncoming).body = resp;
                                                    (resp as ClientIncoming).status = resp.statusCode;
                                                    subscribe.next(resp);
                                                };
                                                const onError = (err: any) => err && subscribe.error(err);
                                                channel.on(ev.CLOSE, onError);
                                                channel.on(ev.ERROR, onError);
                                                channel.on(ev.ABOUT, onError);
                                                channel.on(ev.TIMEOUT, onError);
                                                channel.on(ev.RESPONSE, onResponse);

                                                return () => {
                                                    channel.off(ev.CLOSE, onError);
                                                    channel.off(ev.ERROR, onError);
                                                    channel.off(ev.ABOUT, onError);
                                                    channel.off(ev.TIMEOUT, onError);
                                                    channel.off(ev.RESPONSE, onResponse);
                                                    subscribe.unsubscribe();
                                                }
                                            })
                                        } else {
                                            return fromEvent(channel!, ev.RESPONSE, (headers) => incomingFactory.create({ status: headers[':status'], headers, payload: channel } as UrlClientIncomingOpts));
                                        }

                                    },
                                    async (socket: ClientHttp2Session | null, msg: Buffer | string | IReadable, req: HttpRequest<any>, context) => {
                                        let url = req.urlWithParams;
                                        const clientOpts = options as HttpClientConfig;
                                        const ac = req.context.get(ABORT_CONTROLLER);
                                        let stream: ClientHttp2Stream | ClientRequest;
                                        if (clientOpts.authority && socket && (!httptl.test(url) || url.startsWith(clientOpts.authority))) {
                                            url = url.replace(clientOpts.authority, '');

                                            const reqHeaders = req.headers.getHeaders() as OutgoingHttpHeaders;

                                            if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
                                            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
                                            reqHeaders[HTTP2_HEADER_PATH] = url;

                                            stream = socket.request(reqHeaders, { abort: ac?.signal, ...clientOpts.requestOptions } as ClientSessionRequestOptions);


                                        } else {
                                            const headers = req.headers.getHeaders();
                                            const option = {
                                                method: req.method,
                                                headers: {
                                                    'accept': ctype.REQUEST_ACCEPT,
                                                    ...headers,
                                                },
                                                abort: ac?.signal
                                            };

                                            stream = secureExp.test(url) ? httpsRequest(url, option) : httpRequest(url, option);
                                        }

                                        context.set(REQUEST_STREAM, stream);

                                        if (isNil(msg)) {
                                            await promisify(stream.end, stream)();
                                        } else {
                                            await streamAdapter.pipeTo(msg, stream, { end: true });
                                        }
                                        // return stream;

                                    },
                                    async (socket) => {
                                        if (socket) {
                                            socket.destroy();
                                        }
                                    }
                                )
                            },
                        }
                    },
                    deps: [
                        DefaultSerializerFactory,
                        DefaultDeserializerFactory,
                        [HttpStatusAdapter, InjectFlags.Optional],
                        [HeaderAdapter, InjectFlags.Optional],
                        StreamAdapter,
                        UrlClientIncomingFactory,
                        DefaultClientTransferFactory,
                        HttpResponseEventFactory,
                        [UrlRedirector, InjectFlags.Optional]
                    ]
                },
                transferConfig: {
                    interceptors: STATUS_RESPONSE_TRANSFER_INTERCEPTORS
                },
                serializerConfig: {
                    interceptors: [
                        bodyServializeInterceptor
                    ]
                }
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'http',
            serverType: HttpServer,
            imports: [
                MimeModule
            ],
            defaultConfig: {
                handlerType: HttpRequestHandler,
                listenOpts: { port: 3000, host: LOCALHOST },
                execptionHandlers: HttpExecptionHandlers,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: HttpIncomingFactory, outgoingFactory: UrlOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                return new DefaultServerTransport<Http2Server | HttpsServer | Server, HttpContext, Buffer | string | IReadable>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: contextBodySerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: bodyDesrializeBackend,
                                        ...options.deserializerConfig
                                    }),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    fileAdapter,
                                    mimeAdapter,
                                    acceptsPriority,
                                    incomingFactory,
                                    outgoingFactory,
                                    transferFactory.create(injector, {
                                        backend: (input: HttpIncomings, context: TransportContext) => {
                                            const transport = context.transport as ServerTransport;
                                            const { injector, serverOptions } = transport;
                                            return of(new HttpContext(injector, transport, input.req, input.res, serverOptions as HttpServConfig))
                                        },
                                        ...options.transferConfig
                                    }),
                                    options,
                                    (socket: Http2Server | HttpsServer | Server, factory, instance) => {
                                        return new Observable<HttpIncomings>(subscribe => {
                                            const onRequest = (req: HttpServRequest, res: HttpServResponse) => subscribe.next(incomingFactory.create({ req, res }));
                                            const onError = (err: any) => err && subscribe.error(err);
                                            socket.on(ev.CLOSE, onError);
                                            socket.on(ev.ERROR, onError);
                                            socket.on(ev.ABOUT, onError);
                                            socket.on(ev.TIMEOUT, onError);
                                            socket.on(ev.REQUEST, onRequest);

                                            return () => {
                                                socket.off(ev.CLOSE, onError);
                                                socket.off(ev.ERROR, onError);
                                                socket.off(ev.ABOUT, onError);
                                                socket.off(ev.TIMEOUT, onError);
                                                socket.off(ev.REQUEST, onRequest);
                                                subscribe.unsubscribe();
                                            }
                                        })
                                    },
                                    (socket: Http2Server | HttpsServer | Server, msg: Buffer | string | IReadable, reqContext: HttpContext, context: TransportContext) => {
                                        if (isNil(msg)) {
                                            return promisify(reqContext.response.end, reqContext.response)();
                                        } else if (streamAdapter.isStream(msg)) {
                                            return streamAdapter.pipeTo(msg, reqContext.response, { end: true });
                                        } else {
                                            return promisify<any, void>(reqContext.response.end, reqContext.response)(msg);
                                        }
                                    }
                                )
                            },
                        }
                    },
                    deps: [
                        DefaultSerializerFactory,
                        DefaultDeserializerFactory,
                        [HttpStatusAdapter, InjectFlags.Optional],
                        [HeaderAdapter, InjectFlags.Optional],
                        StreamAdapter,
                        FileAdapter,
                        [MimeAdapter, InjectFlags.Optional],
                        [AcceptsPriority, InjectFlags.Optional],
                        HttpIncomingFactory,
                        UrlOutgoingFactory,
                        DefaultServerTransferFactory
                    ]
                },
                serializerConfig: {
                    interceptors: [
                        execptionMessageSerializeInterceptor,
                        emptyStatusSerializeInterceptor,
                        headMethodSerializeInterceptor,
                        noBodySerializeInterceptor,
                        lengthLimitSerializeInterceptor
                    ]
                },
                detailError: true,
                interceptorsToken: HTTP_SERV_INTERCEPTORS,
                filtersToken: HTTP_SERV_FILTERS,
                guardsToken: HTTP_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ],
                interceptors: [
                    JsonInterceptor,
                    BodyparserInterceptor
                ]
            }
        }
    }

}

export class HttpIncomings<T = any> implements Incoming<T> {
    id: string | number | undefined;
    noHead?: boolean | undefined;
    get headers(): Record<string, Header> {
        return this.req.headers
    }
    public payload: string | Buffer | IReadable | null;

    constructor(
        readonly req: HttpServRequest,
        readonly res: HttpServResponse
    ) {
        const len = ~~(req.headers['content-length'] ?? '0');
        if (len) {
            this.payload = req as IReadable;
        } else {
            this.payload = null;
        }

    }
}


@Injectable()
export class HttpIncomingFactory implements IncomingFactory {

    constructor() { }

    create(options: StreamIncomingOptions<any>): HttpIncomings {
        return new HttpIncomings(options.req, options.res);
    }
}

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = constants;

const httptl = /^https?:\/\//i;
const secureExp = /^https:/;

const REQUEST_STREAM = tokenId<ClientHttp2Stream | ClientRequest>('REQUEST_STREAM');

const ABORT_CONTROLLER = new ContextToken(() => new AbortController());



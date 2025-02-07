import { Injectable, InjectFlags, InvocationContext, isNil, isString, promisify } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { Header, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    ClientIncoming, ctype, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory, ev,
    FileAdapter, IEventEmitter, Incoming, IncomingFactory, IncomingOpts, IReadable, MimeAdapter, Packet,
    Redirector, SerializerFactory, StatusAdapter, StreamAdapter, StreamIncomingOptions, TransportContext, UrlClientIncomingFactory,
    UrlClientIncomingOpts, UrlOutgoingFactory
} from '@tsdi/common/transport';
import {
    BodyServializetInterceptor,
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, STATUS_RESPONSE_TRANSFER_INTERCEPTORS, UrlRedirector
} from '@tsdi/common/client';
import { HttpRequest } from '@tsdi/common/http';
import {
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts,
    MimeModule, ServiceModuleOpts, JsonInterceptor, BodyparserInterceptor, AcceptsPriority, ServerTransferFactory,
    DefaultServerTransferFactory, DefaultServerTransport, ServerTransport,
    HttpServerOpts
} from '@tsdi/endpoints';
import { request as httpRequest, IncomingMessage, ClientRequest, Server, STATUS_CODES } from 'http';
import { request as httpsRequest, Server as HttpsServer } from 'https';
import {
    ClientHttp2Session, ClientHttp2Stream, constants, OutgoingHttpHeaders,
    ClientSessionRequestOptions, Http2Server
} from 'http2';
import { fromEvent, Observable, of } from 'rxjs';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS, HttpClientOpts } from './client/options';
import { HttpHandler } from './client/handler';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS } from './server/options';
import { HttpRequestHandler } from './server/handler';
import { HttpServer } from './server/server';
import { HttpStatusAdapter } from './status';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpExecptionHandlers } from './execption.handlers';
import { HttpContext, HttpServRequest, HttpServResponse } from './server/context';
import { EmptyStatusSerializeInterceptor, HeadMethodSerializeInterceptor, LengthLimitSerializeInterceptor, NoBodySerializeInterceptor } from './server/interceptors/serializes';


@Configuration()
export class HttpConfiguration {


    @Bean(CLIENT_MODULES, { static: true, multi: true })
    client(): ClientModuleOpts {
        return this.getClientOptions();
    }


    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions() as ServerModuleOpts;
        option.defaultOpts!.middlewaresToken = HTTP_MIDDLEWARES,
            option.defaultOpts!.content = {
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
            defaultOpts: {
                handlerType: HttpHandler,
                interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                filtersToken: HTTP_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultClientTransport<ClientHttp2Session | null, HttpRequest<any>>(
                                    injector,
                                    socket,
                                    'http',
                                    serializerFactory.create(injector, {
                                        backend: (input: HttpRequest<any>, context?: TransportContext) => {
                                            return of(input)
                                        },
                                        ...transportOptions.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: (input: any, context: TransportContext) => {
                                            return of(input)
                                        },
                                        ...transportOptions.deserializerConfig
                                    }),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, transportOptions.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (socket: ClientHttp2Session | null, channel?: ClientHttp2Stream | ClientRequest | IEventEmitter | null, req?: HttpRequest<any>) => {
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
                                    async (socket: ClientHttp2Session | null, msg: Packet, req: HttpRequest<any>, channel?: IEventEmitter | null) => {
                                        let url = req.urlWithParams;
                                        const clientOpts = options as HttpClientOpts;
                                        const ac = getAbortSignal(req.context);
                                        let stream: ClientHttp2Stream | ClientRequest;
                                        if (clientOpts.authority && socket && (!httptl.test(url) || url.startsWith(clientOpts.authority))) {
                                            url = url.replace(clientOpts.authority, '');

                                            const reqHeaders = headerAdapter?.getHeaders(msg.headers ?? {}) as OutgoingHttpHeaders;

                                            if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
                                            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
                                            reqHeaders[HTTP2_HEADER_PATH] = url;

                                            stream = socket.request(reqHeaders, { abort: ac?.signal, ...clientOpts.requestOptions } as ClientSessionRequestOptions);

                                        } else {
                                            const headers = headerAdapter?.getHeaders(msg.headers ?? {});

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


                                        if (isNil(msg.payload)) {
                                            await promisify(stream.end, stream)();
                                        } else {
                                            await streamAdapter.pipeTo(msg.payload, stream, { end: true });
                                        }
                                        return stream;

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
                        [PatternFormatter, InjectFlags.Optional],
                        [HttpStatusAdapter, InjectFlags.Optional],
                        [HeaderAdapter, InjectFlags.Optional],
                        StreamAdapter,
                        UrlClientIncomingFactory,
                        DefaultClientTransferFactory,
                        HttpResponseEventFactory,
                        [UrlRedirector, InjectFlags.Optional]
                    ]
                },
                transportOptions: {
                    transferConfig: {
                        interceptors: STATUS_RESPONSE_TRANSFER_INTERCEPTORS
                    },
                    serializerConfig: {
                        interceptors: [
                            BodyServializetInterceptor
                        ]
                    }
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
            defaultOpts: {
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
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultServerTransport<Http2Server | HttpsServer | Server, HttpContext>(
                                    injector,
                                    socket,
                                    'http',
                                    serializerFactory.create(injector, {
                                        backend: (input: HttpContext, context?: TransportContext) => {
                                            let payload = input.body;
                                            let packet: Packet;
                                            if (Buffer.isBuffer(payload) || isString(payload) || streamAdapter.isReadable(payload)) {
                                                packet = { payload }
                                            } else {
                                                payload = JSON.stringify(payload);
                                                if (!input.headersSent) {
                                                    input.length = Buffer.byteLength(payload)
                                                }
                                                packet = { payload };
                                            }
                                            return of(packet)
                                        },
                                        ...transportOptions.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: (input, context) => {
                                            return of(input)
                                        },
                                        ...transportOptions.deserializerConfig
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
                                            return of(new HttpContext(injector, transport, input.req, input.res, serverOptions as HttpServerOpts))
                                        },
                                        ...transportOptions.transferConfig
                                    }),
                                    options,
                                    (socket: Http2Server | HttpsServer | Server, channel?: IEventEmitter | null) => {
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
                                    (socket: Http2Server | HttpsServer | Server, msg: Packet, context: HttpContext, channel?: IEventEmitter | null) => {
                                        if (isNil(msg.payload)) {
                                            return promisify(context.response.end, context.response)();
                                        } else if (streamAdapter.isStream(msg.payload)) {
                                            return streamAdapter.pipeTo(msg.payload, context.response, { end: true });
                                        } else {
                                            return promisify<any, void>(context.response.end, context.response)(msg.payload);
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
                transportOptions: {
                    serializerConfig: {
                        interceptors: [
                            EmptyStatusSerializeInterceptor,
                            HeadMethodSerializeInterceptor,
                            NoBodySerializeInterceptor,
                            LengthLimitSerializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                    }
                },

                detailError: true,
                interceptorsToken: HTTP_SERV_INTERCEPTORS,
                filtersToken: HTTP_SERV_FILTERS,
                guardsToken: HTTP_SERV_GUARDS,
                filters: [
                    LoggerInterceptor,
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

function getAbortSignal(ctx?: InvocationContext): AbortController {
    return (!ctx || typeof AbortController === 'undefined') ? null! : ctx.getValueify(AbortController, () => new AbortController());
}


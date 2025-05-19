import { InjectFlags, isNil, promisify, tokenId } from '@tsdi/ioc';
import { Bean, Configuration, ExceptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, Header, HeaderAdapter, ResponseEvent, ResponseFactory } from '@tsdi/common';
import {
    messageVaildateInterceptor, deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory,
    DeserializerFactory, FileAdapter, MimeAdapter, PacketDeserializeInterceptor,
    messageSerializeInterceptor, Redirector, SerializerFactory, StatusAdapter, StreamAdapter,
    UrlClientIncomingFactory, UrlOutgoingFactory, PayloadDeserializeInterceptor,
    UrlIncomingFactory,
    NotSupportedException,
    IReadable, ev,
    ClientIncoming,
    TransportContext,
    Incoming
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport,
    readabeRequestBodyerializeInterceptor,
    requestPacketIfySerializeInterceptor, requestSerializeBackend, requestTimeoutInterceptor, SocketClientTransport
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, SERVER_MODULES, ServerModuleOpts, ServiceModuleOpts,
    ExceptionFinalizeFilter, FinalizeFilter, LoggerFilter,
    execptionSerializeInterceptor, contextSerializeBackend, lengthLimitSerializeInterceptor,
    ServerTransferFactory, SocketServerTransport,
    packetIfySerializeInterceptor,
    headersReadableBodyInterceptor,
    DefaultServerTransport,
    UrlRequestContext
} from '@tsdi/endpoints';
import { CoapClient } from './client/client';
import { CoapHandler } from './client/handler';
import { COAP_CLIENT_FILTERS, COAP_CLIENT_INTERCEPTORS } from './client/options';
import { CoapServer } from './server/server';
import { CoapRequestHandler } from './server/handler';
import { COAP_MIDDLEWARES, COAP_SERV_FILTERS, COAP_SERV_GUARDS, COAP_SERV_INTERCEPTORS } from './server/options';
import { Agent, IncomingMessage, OutgoingMessage,  Server as CoAPServer } from 'coap';
import { CoapRequest } from './client/request';
import { Observable } from 'rxjs';



const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;
// const defaultMaxSize = 1024 * 256;


const delimiter = Buffer.from('#');

@Configuration()
export class CoapConfiguration {

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    microClient(): ClientModuleOpts {
        const options = this.getClientOptions(true);
        // options.microservice = true;
        return options;
    }

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    client(): ClientModuleOpts {
        return this.getClientOptions(false);
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    microServ(): ServiceModuleOpts {
        const option = this.getServOptions(true);
        option.defaultConfig!.content = {
            root: 'public',
            prefix: 'content'
        };
        // option.microservice = true;
        return option;
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions(false) as ServerModuleOpts;
        option.defaultConfig!.middlewaresToken = COAP_MIDDLEWARES,
            option.defaultConfig!.content = {
                root: 'public'
            };
        return option;
    }


    private getClientOptions(microservice: boolean): ClientModuleOpts {
        return {
            transport: 'tcp',
            clientType: CoapClient,
            microservice,
            defaultConfig: {
                handlerType: CoapHandler,
                interceptorsToken: COAP_CLIENT_INTERCEPTORS,
                filtersToken: COAP_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                return new DefaultClientTransport<Agent, CoapRequest<any>, Buffer | string | IReadable>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, options.deserializerConfig),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, options.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (socket, factory, instance) => {
                                        const context = instance ?? factory();
                                        const channel = context.get(REQUEST_STREAM);
                                        return new Observable<ClientIncoming>(subscribe => {
                                            const onResponse = (resp: IncomingMessage) => {
                                                (resp as ClientIncoming).body = resp;
                                                (resp as ClientIncoming).status = resp.code;
                                                subscribe.next(resp as ClientIncoming);
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

                                    },
                                    async (socket, msg, req, context) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedException('Not supported stream payload');
                                        const stream = socket.request({
                                            // hostname: ,
                                            method: req.method as any,
                                            headers: req.headers.getHeaders(),
                                            pathname: req.url,
                                            query: req.params.toString()
                                        });

                                        context.set(REQUEST_STREAM, stream);


                                        if (isNil(msg)) {
                                            await promisify(stream.end, stream)();
                                        } else {
                                            await streamAdapter.pipeTo(msg, stream, { end: true });
                                        }

                                    }
                                )
                            },
                        }
                    },
                    deps: [
                        DefaultSerializerFactory,
                        DefaultDeserializerFactory,
                        [StatusAdapter, InjectFlags.Optional],
                        HeaderAdapter,
                        StreamAdapter,
                        UrlClientIncomingFactory,
                        DefaultClientTransferFactory,
                        DefaultResponseFactory,
                        [Redirector, InjectFlags.Optional]
                    ]
                },
                serializerConfig: {
                    interceptors: [
                        messageVaildateInterceptor,
                        messageSerializeInterceptor,
                        requestPacketIfySerializeInterceptor,
                        readabeRequestBodyerializeInterceptor
                    ]
                },
                deserializerConfig: {
                    interceptors: [
                        deatchPacketIdInterceptor,
                        PacketDeserializeInterceptor,
                        PayloadDeserializeInterceptor
                    ]
                },
                transportOptions: {
                    delimiter
                },
                interceptors: [
                    requestTimeoutInterceptor
                ]
            }
        }
    }

    private getServOptions(microservice: boolean): ServiceModuleOpts {
        return {
            transport: 'tcp',
            serverType: CoapServer,
            microservice,
            defaultConfig: {
                handlerType: CoapRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: UrlIncomingFactory, outgoingFactory: UrlOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                return new DefaultServerTransport<CoAPServer, UrlRequestContext, any>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: contextSerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, options.deserializerConfig),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    fileAdapter,
                                    mimeAdapter,
                                    acceptsPriority,
                                    incomingFactory,
                                    outgoingFactory,
                                    transferFactory.create(injector, options.transferConfig),
                                    options,
                                    (socket: CoAPServer, factory, instance) => {
                                        return new Observable<OutgoingMessage>(subscribe => {
                                            const onRequest = (req:any, res: any) => subscribe.next(incomingFactory.create({ req, res }));
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
                                    (socket: CoAPServer, msg: Buffer | string | IReadable, reqContext: UrlRequestContext, context: TransportContext) => {
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
                        [StatusAdapter, InjectFlags.Optional],
                        HeaderAdapter,
                        StreamAdapter,
                        FileAdapter,
                        [MimeAdapter, InjectFlags.Optional],
                        [AcceptsPriority, InjectFlags.Optional],
                        UrlIncomingFactory,
                        UrlOutgoingFactory,
                        DefaultServerTransferFactory
                    ]
                },
                serializerConfig: {
                    interceptors: [
                        lengthLimitSerializeInterceptor,
                        messageSerializeInterceptor,
                        packetIfySerializeInterceptor,
                        execptionSerializeInterceptor,
                        headersReadableBodyInterceptor
                    ]
                },
                deserializerConfig: {
                    interceptors: [
                        PacketDeserializeInterceptor,
                        PayloadDeserializeInterceptor
                    ]
                },
                transportOptions: {
                    delimiter
                },
                detailError: false,
                interceptorsToken: COAP_SERV_INTERCEPTORS,
                filtersToken: COAP_SERV_FILTERS,
                guardsToken: COAP_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExceptionFinalizeFilter,
                    ExceptionHandlerFilter,
                    FinalizeFilter
                ]
            }
        }
    }

}



// export class CoapIncoming<T = any> implements Incoming<T> {
//     id: string | number | undefined;
//     noHead?: boolean | undefined;
//     get headers(): Record<string, Header> {
//         return this.req.headers
//     }
//     public payload: string | Buffer | IReadable | null;

//     constructor(
//         readonly req: IncomingMessage,
//         readonly res: OutgoingMessage
//     ) {
//         const len = ~~(req.headers['content-length'] ?? '0');
//         if (len) {
//             this.payload = req as IReadable;
//         } else {
//             this.payload = null;
//         }

//     }
// }

const REQUEST_STREAM = tokenId<OutgoingMessage>('REQUEST_STREAM');

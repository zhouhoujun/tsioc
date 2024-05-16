import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { CLIENT_MODULES, ClientOpts } from '@tsdi/common/client';
import { isBuffer, toBuffer } from '@tsdi/common/transport';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { Socket, RemoteInfo } from 'dgram';
import { UdpClient } from './client/client';
import { UDP_CLIENT_FILTERS, UDP_CLIENT_INTERCEPTORS } from './client/options';
import { UdpHandler } from './client/handler';
import { UdpServer } from './server/server';
import { UDP_SERV_FILTERS, UDP_SERV_GUARDS, UDP_SERV_INTERCEPTORS } from './server/options';
import { UdpEndpointHandler } from './server/handler';
import { defaultMaxSize } from './consts';
import { UdpTransportSessionFactory } from './server/server.session';
import { UdpClientTransportSessionFactory } from './client/client.session';


const udptl = /^udp(s)?:\/\//i;


@Module({
    providers: [
        UdpClient,
        UdpServer,
        UdpClientTransportSessionFactory,
        UdpTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'udp',
                clientType: UdpClient,
                hanlderType: UdpHandler,
                defaultOpts: {
                    url: 'udp://localhost:3000',
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        messageEvent: 'message',
                        messageEventHandle(msg: Buffer, rinfo: RemoteInfo) {
                            return { msg, rinfo };
                        },
                        parseIncomingMessage(incoming: { msg: Buffer, rinfo: RemoteInfo }, context) {
                            context.incoming = incoming;
                            return incoming.msg
                        },
                        beforeEncode(context, input) {
                            if (!context.channel) {
                                const url = new URL(input.url!);
                                context.channel = url.hostname;
                            }
                        },
                        parseOutgoingMessage(outgoing, encodedMsg, context) {
                            if (isBuffer(encodedMsg)) return encodedMsg;
                            return toBuffer(encodedMsg, context.options.maxSize);
                        },
                        write(socket: Socket, data, originData, context, cb) {
                            const url = originData.url ?? originData.topic;

                            const idx = url.lastIndexOf(':');

                            const port = parseInt(url.substring(idx + 1));
                            const addr = url.substring(0, idx);
                            socket.send(data, port, addr, cb);
                        }
                    },
                    interceptorsToken: UDP_CLIENT_INTERCEPTORS,
                    filtersToken: UDP_CLIENT_FILTERS,
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'udp',
                microservice: true,
                serverType: UdpServer,
                handlerType: UdpEndpointHandler,
                defaultOpts: {
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        messageEvent: 'message',
                        messageEventHandle(msg: Buffer, rinfo: RemoteInfo) {
                            return { msg, rinfo };
                        },
                        beforeDecode(context, msg: { msg: Buffer, rinfo: RemoteInfo }) {
                            if (!context.channel) {
                                const rinfo = msg.rinfo;
                                context.channel = rinfo.family == 'IPv6' ? `[${rinfo.address}]:${rinfo.port}` : `${rinfo.address}:${rinfo.port}`
                            }
                        },
                        parseIncomingMessage(incoming: { msg: Buffer, rinfo: RemoteInfo }, context) {
                            context.incoming = incoming;
                            return incoming.msg
                        },
                        afterDecode(context, msg, decoded) {
                            
                        },
                        parseOutgoingMessage(outgoing, encodedMsg, context) {
                            if (isBuffer(encodedMsg)) return encodedMsg;
                            return toBuffer(encodedMsg, context.options.maxSize);
                        },
                        write(socket: Socket, data, originData, ctx, cb) {
                            const url = ctx.channel!;
                            const idx = url.lastIndexOf(':');
                            const port = parseInt(url.substring(idx + 1));
                            const addr = url.substring(0, idx);
                            socket.send(data, port, addr, cb);
                        }
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: true,
                    interceptorsToken: UDP_SERV_INTERCEPTORS,
                    filtersToken: UDP_SERV_FILTERS,
                    guardsToken: UDP_SERV_GUARDS,
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class UdpModule {

}
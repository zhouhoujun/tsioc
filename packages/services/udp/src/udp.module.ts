import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { CLIENT_MODULES, ClientOpts } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { Socket, RemoteInfo } from 'dgram';
import { UdpClient } from './client/client';
import { UDP_CLIENT_FILTERS, UDP_CLIENT_INTERCEPTORS } from './client/options';
import { UdpHandler } from './client/handler';
import { UdpServer } from './server/server';
import { UDP_SERV_FILTERS, UDP_SERV_GUARDS, UDP_SERV_INTERCEPTORS } from './server/options';
import { UdpEndpointHandler } from './server/handler';
import { defaultMaxSize } from './consts';
import { UdpClientMessageDecodeFilter, UdpClientMessageEncodeFilter } from './client/filters';
import { UdpMessageDecodeFilter, UdpMessageEncodeFilter } from './server/filters';
import { UdpMessageFactory } from './message';
import { UdpClientIncomingFactory } from './incoming';



@Module({
    providers: [
        UdpClient,
        UdpServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'udp',
                microservice: true,
                clientType: UdpClient,
                hanlderType: UdpHandler,
                defaultOpts: {
                    url: 'udp://localhost:3000',
                    interceptorsToken: UDP_CLIENT_INTERCEPTORS,
                    filtersToken: UDP_CLIENT_FILTERS,
                    messageFactory: { useClass: UdpMessageFactory },
                    incomingFactory: { useClass: UdpClientIncomingFactory },
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        defaultMethod: '*',                        
                        // messageEvent: 'message',
                        // messageEventHandle(msg: Buffer, rinfo: RemoteInfo) {
                        //     return { msg, rinfo };
                        // },
                        // encodes: {
                        //     globalFilters: [
                        //         UdpClientMessageEncodeFilter
                        //     ]
                        // },
                        // decodes: {
                        //     globalFilters: [
                        //         UdpClientMessageDecodeFilter
                        //     ]
                        // },
                        write(socket: Socket, data, originData, cb) {
                            const url = context.channel!;
                            const idx = url.lastIndexOf(':');

                            const port = parseInt(url.substring(idx + 1));
                            const addr = url.substring(0, idx);
                            if (addr) {
                                socket.send(data, port, addr, cb);
                            } else {
                                socket.send(data, port, cb);
                            }
                        }
                    }
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
                        defaultMethod: '*',
                        messageEvent: 'message',
                        // messageEventHandle(msg: Buffer, rinfo: RemoteInfo) {
                        //     return { msg, rinfo };
                        // },
                        // encodes: {
                        //     globalFilters: [
                        //         UdpMessageEncodeFilter
                        //     ]
                        // },
                        // decodes: {
                        //     globalFilters: [
                        //         UdpMessageDecodeFilter
                        //     ]
                        // },
                        write(socket: Socket, data, originData, cb) {
                            const rinfo = ctx.incoming?.rinfo ?? originData.incoming?.rinfo as RemoteInfo;
                            let port: number;
                            let addr: string;
                            if (rinfo) {
                                port = rinfo.port;
                                addr = rinfo.address;
                            } else {
                                const url = ctx.channel ?? originData.channel;
                                const idx = url.lastIndexOf(':');
                                port = parseInt(url.substring(idx + 1));
                                addr = url.substring(0, idx);
                            }
                            if (addr) {
                                socket.send(data, port, addr, cb);
                            } else {
                                socket.send(data, port, cb);
                            }
                        }
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: false,
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
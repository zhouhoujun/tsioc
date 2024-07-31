import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { isResponseEvent, LOCALHOST, Message, Packet } from '@tsdi/common';
import { CustomCodingsAdapter } from '@tsdi/common/codings';
import { ClientIncomingPacket, IncomingPacket } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import {
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, PatternRequestContext,
    RequestContext, SERVER_MODULES, ServerModuleOpts, ServiceModuleOpts
} from '@tsdi/endpoints';
import { TcpClient } from './client/client';
import { TcpHandler } from './client/handler';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS } from './client/options';
import { TcpMessage, TcpMessageFactory } from './message';
import { TcpClientIncoming, TcpClientIncomingFactory, TcpIncoming, TcpIncomingFactory } from './incoming';
import { TcpRequest } from './client/request';
import { TcpServer } from './server/server';
import { TcpRequestHandler } from './server/handler';
import { TCP_MIDDLEWARES, TCP_SERV_FILTERS, TCP_SERV_GUARDS, TCP_SERV_INTERCEPTORS } from './server/options';
import { TcpOutgoing, TcpOutgoingFactory } from './outgoing';

// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 1048576; // 1024 * 1024;
const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;

@Configuration()
export class TcpConfiguration {

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    microClient(): ClientModuleOpts {
        const options = this.getClientOptions();
        options.microservice = true;
        return options;
    }

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    client(): ClientModuleOpts {
        return this.getClientOptions();
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    microServ(): ServiceModuleOpts {
        const option = this.getServOptions();
        option.defaultOpts!.transportOpts!.defaultMethod = '*';
        option.defaultOpts!.content = {
            root: 'public',
            prefix: 'content'
        };
        option.microservice = true;
        return option;
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions() as ServerModuleOpts;
        option.defaultOpts!.transportOpts!.defaultMethod = 'GET';
        option.defaultOpts!.middlewaresToken = TCP_MIDDLEWARES,
            option.defaultOpts!.content = {
                root: 'public'
            };
        return option;
    }


    private getClientOptions(): ClientModuleOpts {
        return {
            transport: 'tcp',
            clientType: TcpClient,
            defaultOpts: {
                handlerType: TcpHandler,
                interceptorsToken: TCP_CLIENT_INTERCEPTORS,
                filtersToken: TCP_CLIENT_FILTERS,
                messageFactory: TcpMessageFactory,
                incomingFactory: TcpClientIncomingFactory,
                transportOpts: {
                    delimiter: '#',
                    maxSize: defaultMaxSize,
                    encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[TcpRequest, Packet]]) },
                    decodingsAdapter: { useValue: new CustomCodingsAdapter(isResponseEvent, [[TcpClientIncoming, ClientIncomingPacket], [TcpMessage, Message]]) },
                }
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'tcp',
            serverType: TcpServer,
            defaultOpts: {
                handlerType: TcpRequestHandler,
                listenOpts: { port: 3000, host: LOCALHOST },
                transportOpts: {
                    delimiter: '#',
                    maxSize: defaultMaxSize,
                    decodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof RequestContext, [[TcpIncoming, IncomingPacket], [TcpMessage, Message]]) },
                    encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[PatternRequestContext, RequestContext], [TcpOutgoing, Packet]]) },
                },
                detailError: false,
                interceptorsToken: TCP_SERV_INTERCEPTORS,
                filtersToken: TCP_SERV_FILTERS,
                guardsToken: TCP_SERV_GUARDS,
                messageFactory: TcpMessageFactory,
                incomingFactory: TcpIncomingFactory,
                outgoingFactory: TcpOutgoingFactory,
                filters: [
                    LoggerInterceptor,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            }
        }
    }

}
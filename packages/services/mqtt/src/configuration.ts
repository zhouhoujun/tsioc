import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST, Message, Packet, isResponseEvent } from '@tsdi/common';
import { CustomCodingsAdapter } from '@tsdi/common/codings';
import { AbstractClientIncoming, AbstractIncoming } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import {
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, PatternRequestContext,
    RequestContext, SERVER_MODULES, ServiceModuleOpts
} from '@tsdi/endpoints';
import { MqttClient } from './client/client';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS } from './client/options';
import { MqttHandler } from './client/handler';
import { MqttServer } from './server/server';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS } from './server/options';
import { MqttRequestHandler } from './server/handler';
import { MqttMessage, MqttMessageFactory } from './message';
import { MqttRequest } from './client/request';
import { MqttClientIncoming, MqttClientIncomingFactory } from './client/transport';
import { MqttIncoming, MqttIncomingFactory, MqttOutgoing, MqttOutgoingFactory } from './server/transport';


const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;



@Configuration()
export class MqttConfiguration {

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    microClient(): ClientModuleOpts {
        return this.getClientOptions();
    }


    @Bean(SERVER_MODULES, { static: true, multi: true })
    microServ(): ServiceModuleOpts {
        return this.getServOptions();
    }


    private getClientOptions(): ClientModuleOpts {
        return {
            transport: 'mqtt',
            microservice: true,
            asDefault: true,
            clientType: MqttClient,
            defaultOpts: {
                handlerType: MqttHandler,
                url: 'mqtt://localhost:1883',
                interceptorsToken: MQTT_CLIENT_INTERCEPTORS,
                filtersToken: MQTT_CLIENT_FILTERS,
                messageReader: MqttMessageReader,
                messageWriter: MqttMessageWriter,
                messageFactory: MqttMessageFactory,
                incomingFactory: MqttClientIncomingFactory,
                transportOpts: {
                    delimiter: '#',
                    maxSize: defaultMaxSize,
                    encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof MqttMessage, [[MqttRequest, Packet]]) },
                    decodingsAdapter: { useValue: new CustomCodingsAdapter(isResponseEvent, [[MqttClientIncoming, AbstractClientIncoming], [MqttMessage, Message]]) },
                }
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'mqtt',
            microservice: true,
            asDefault: true,
            serverType: MqttServer,
            defaultOpts: {
                handlerType: MqttRequestHandler,
                transportOpts: {
                    delimiter: '#',
                    defaultMethod: '*',
                    maxSize: defaultMaxSize,
                    decodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof RequestContext, [[MqttIncoming, AbstractIncoming], [MqttMessage, Message]]) },
                    encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof MqttMessage, [[PatternRequestContext, RequestContext], [MqttOutgoing, Packet]]) },
                },
                content: {
                    root: 'public',
                    prefix: 'content'
                },
                serverOpts: {
                    host: LOCALHOST,
                    port: 1883
                },

                detailError: false,
                interceptorsToken: MQTT_SERV_INTERCEPTORS,
                filtersToken: MQTT_SERV_FILTERS,
                guardsToken: MQTT_SERV_GUARDS,
                messageFactory: MqttMessageFactory,
                incomingFactory: MqttIncomingFactory,
                outgoingFactory: MqttOutgoingFactory,
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
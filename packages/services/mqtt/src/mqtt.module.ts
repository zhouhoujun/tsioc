import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts, TopicTransportBackend } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts, TopicTransportSessionFactory } from '@tsdi/endpoints';
import { MqttClient } from './client/client';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS, MQTT_CLIENT_OPTS } from './client/options';
import { MqttHandler } from './client/handler';
import { MqttServer } from './server/server';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS, MQTT_SERV_OPTS } from './server/options';
import { MqttEndpointHandler } from './server/handler';

const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;

@Module({
    providers: [
        MqttClient,
        MqttServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'mqtt',
                clientType: MqttClient,
                clientOptsToken: MQTT_CLIENT_OPTS,
                hanlderType: MqttHandler,
                defaultOpts: {
                    connectOpts: {
                        host: LOCALHOST,
                        port: 1883
                    },
                    encoding: 'utf8',
                    interceptorsToken: MQTT_CLIENT_INTERCEPTORS,
                    filtersToken: MQTT_CLIENT_FILTERS,
                    backend: TopicTransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: TopicTransportSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'mqtt',
                microservice: true,
                serverType: MqttServer,
                serverOptsToken: MQTT_SERV_OPTS,
                endpointType: MqttEndpointHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    transportOpts: {
                        serverSide: true,
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    serverOpts: {
                        host: LOCALHOST,
                        port: 1883
                    },
                    detailError: true,
                    interceptorsToken: MQTT_SERV_INTERCEPTORS,
                    filtersToken: MQTT_SERV_FILTERS,
                    guardsToken: MQTT_SERV_GUARDS,
                    sessionFactory: { useExisting: TopicTransportSessionFactory },
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
export class MqttModule {

}
import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule } from '@tsdi/core';
import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { BodyContentInterceptor, BodyparserMiddleware, ContentMiddleware, EncodeJsonMiddleware, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, SessionMiddleware, TransportBackend, TransportModule } from '@tsdi/transport';
import { MqttClient } from './client/client';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS, MqttClientOpts } from './client/options';
import { MqttServer } from './server/server';
import { MQTT_SERV_FILTERS, MQTT_SERV_INTERCEPTORS, MQTT_SERV_MIDDLEWARES, MQTT_SERV_OPTS, MqttServerOpts } from './server/options';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        MqttClient,
        MqttServer
    ]
})
export class MqttModule {

    static withOptions(options: MqttServerOpts): ModuleWithProviders<MqttModule> {

        return {
            module: MqttModule,
            providers: [
                { provide: MQTT_SERV_OPTS, useValue: options }
            ]
        }
    }

}


const defaultClient = {
    encoding: 'utf8',
    interceptorsToken: MQTT_CLIENT_INTERCEPTORS,
    filtersToken: MQTT_CLIENT_FILTERS,
    backend: TransportBackend,
    interceptors: [
        BodyContentInterceptor
    ],
    connectOpts: {
        protocol: 'mqtt',
        options: {
            host: 'localhost',
            port: 1883
        }
    },
} as MqttClientOpts;


const defaultServer = {
    json: true,
    encoding: 'utf8',
    serverOpts: {
        protocol: 'mqtt',
        options: {}
    },
    interceptorsToken: MQTT_SERV_INTERCEPTORS,
    execptionsToken: MQTT_SERV_FILTERS,
    middlewaresToken: MQTT_SERV_MIDDLEWARES,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    middlewares: [
        SessionMiddleware,
        ContentMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        HybridRouter
    ]
} as MqttServerOpts;

import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory, createHandler, createAssetEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, BodyparserInterceptor, ContentInterceptor, JsonInterceptor, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, SessionInterceptor, TransportBackend, TransportModule } from '@tsdi/transport';
import { MqttClient } from './client/client';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS, MQTT_CLIENT_OPTS, MqttClientOpts, MqttClientsOpts } from './client/options';
import { MqttServer } from './server/server';
import { MQTT_SERV_FILTERS, MQTT_SERV_INTERCEPTORS, MQTT_SERV_OPTS, MqttServiceOpts } from './server/options';
import { MqttHandler } from './client/handler';
import { MqttEndpoint } from './server/endpoint';
import { MqttTransportSessionFactory } from './transport';


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

    static forMicroService(options: MqttModuleOptions): ModuleWithProviders<MqttModule> {

        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(MqttClient, [{ provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],
            { provide: MQTT_SERV_OPTS, useValue: { ...defClientOpts, ...options.serviceOpts } },
            toProvider(MqttHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: MqttClientOpts) => {
                    return createHandler(injector, { ...defClientOpts, ...opts });
                },
                deps: [Injector, MQTT_CLIENT_OPTS]
            }),
            toProvider(MqttEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: MqttServiceOpts) => {
                    return createAssetEndpoint(injector, opts)
                },
                deps: [Injector, MQTT_SERV_OPTS]
            }),
            toProvider(TransportSessionFactory, options.transportFactory ?? MqttTransportSessionFactory)
        ];

        return {
            module: MqttModule,
            providers
        }
    }

}



export interface MqttModuleOptions {
    /**
     * client options.
     */
    clientOpts?: MqttClientOpts | MqttClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<MqttHandler>;
    /**
     * service endpoint provider
     */
    endpoint?: ProvdierOf<MqttEndpoint>;

    transportFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * service options
     */
    serviceOpts?: MqttServiceOpts;
}



const defClientOpts = {
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
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    interceptors: [
        SessionInterceptor,
        ContentInterceptor,
        JsonInterceptor,
        BodyparserInterceptor,
        HybridRouter
    ]
} as MqttServiceOpts;

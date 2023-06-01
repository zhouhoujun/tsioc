import {
    ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory,
    createHandler, createTransportEndpoint
} from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import {
    BodyContentInterceptor, Bodyparser, Content, Json, Session, ExecptionFinalizeFilter,
    LogInterceptor, ServerFinalizeFilter, TransportBackend, TransportModule, StatusVaildator, RequestAdapter
} from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { MqttClient } from './client/client';
import { MqttHandler } from './client/handler';
import { MqttRequestAdapter } from './client/request';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS, MQTT_CLIENT_OPTS, MqttClientOpts, MqttClientsOpts } from './client/options';
import { MqttServer } from './server/server';
import { MqttEndpoint } from './server/endpoint';
import { MqttExecptionHandlers } from './server/execption.handles';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS, MQTT_SERV_OPTS, MqttServiceOpts } from './server/options';
import { MqttTransportSessionFactory } from './transport';
import { MqttStatusVaildator } from './status';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        MqttTransportSessionFactory,
        { provide: StatusVaildator, useClass: MqttStatusVaildator },
        { provide: RequestAdapter, useClass: MqttRequestAdapter },
        MqttClient,

        MqttExecptionHandlers,
        MqttServer
    ]
})
export class MqttModule {

    /**
     * import mqtt mirco service module with options.
     * @param options mirco service module options.
     * @returns 
     */
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
            { provide: MQTT_SERV_OPTS, useValue: { ...defaultServOpts, ...options.serverOpts } },
            toProvider(MqttHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: MqttClientOpts) => {
                    if (!opts.interceptors || !opts.interceptorsToken) {
                        Object.assign(opts, defClientOpts);
                        injector.setValue(MQTT_CLIENT_OPTS, opts);
                    }
                    return createHandler(injector, opts);
                },
                deps: [Injector, MQTT_CLIENT_OPTS]
            }),
            toProvider(MqttEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: MqttServiceOpts) => {
                    return createTransportEndpoint(injector, opts)
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
    serverOpts?: MqttServiceOpts;
}



const defClientOpts = {
    encoding: 'utf8',
    interceptorsToken: MQTT_CLIENT_INTERCEPTORS,
    filtersToken: MQTT_CLIENT_FILTERS,
    backend: TransportBackend,
    interceptors: [BodyContentInterceptor],
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024,
    },
} as MqttClientOpts;


const defaultServOpts = {
    json: true,
    encoding: 'utf8',
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024,
    },
    content: {
        root: 'public',
        prefix: '/content'
    },
    detailError: true,
    interceptorsToken: MQTT_SERV_INTERCEPTORS,
    filtersToken: MQTT_SERV_FILTERS,
    guardsToken: MQTT_SERV_GUARDS,
    backend: HybridRouter,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    interceptors: [
        Session,
        Content,
        Json,
        Bodyparser
    ]
} as MqttServiceOpts;

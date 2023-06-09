import { ExecptionHandlerFilter, HybridRouter, MicroServiceRouterModule, RouterModule, TransformModule, TransportSessionFactory, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, Json, Session, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, TransportModule, StatusVaildator } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { MqttServer } from './server';
import { MqttEndpoint } from './endpoint';
import { MqttExecptionHandlers } from './execption.handles';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS, MQTT_SERV_OPTS, MqttServiceOpts } from './options';
import { MqttTransportSessionFactory } from '../transport';
import { MqttStatusVaildator } from '../status';





const defaultServOpts = {
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


@Module({
    imports: [
        TransformModule,
        MicroServiceRouterModule.forRoot('mqtt'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        MqttTransportSessionFactory,
        { provide: TransportSessionFactory, useExisting: MqttTransportSessionFactory, asDefault: true },
        { provide: StatusVaildator, useClass: MqttStatusVaildator },
        { provide: MQTT_SERV_OPTS, useValue: { ...defaultServOpts }, asDefault: true },
        {
            provide: MqttEndpoint,
            useFactory: (injector: Injector, opts: MqttServiceOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, MQTT_SERV_OPTS]
        },
        MqttExecptionHandlers,
        MqttServer
    ]
})
export class MqttMicroServiceModule {

    /**
     * import mqtt micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
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
    ): ModuleWithProviders<MqttMicroServiceModule> {

        const providers: ProviderType[] = [
            { provide: MQTT_SERV_OPTS, useValue: { ...defaultServOpts, ...options.serverOpts } }
        ];

        if (options.endpoint) {
            providers.push(toProvider(MqttEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }


        return {
            module: MqttMicroServiceModule,
            providers
        }
    }

}


import { ExecptionHandlerFilter, StatusVaildator, MicroServRouterModule, TransformModule, createTransportEndpoint } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, Json, Session, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { MqttServer } from './server';
import { MqttEndpoint } from './endpoint';
import { MqttExecptionHandlers } from './execption.handles';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS, MQTT_SERV_OPTS, MqttServiceOpts } from './options';
import { MqttTransportSessionFactory, MqttTransportSessionFactoryImpl } from '../transport';
import { MqttStatusVaildator } from '../status';





const defaultServOpts = {
    encoding: 'utf8',
    transportOpts: {
        delimiter: '#',
        maxSize: 1024 * 256 - 6,
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: MQTT_SERV_INTERCEPTORS,
    filtersToken: MQTT_SERV_FILTERS,
    guardsToken: MQTT_SERV_GUARDS,
    backend: MicroServRouterModule.getToken('mqtt'),
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
    ],
    providers: [
        { provide: StatusVaildator, useExisting: MqttStatusVaildator }
    ]
} as MqttServiceOpts;


/**
 * Mqtt microservice module
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('mqtt'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: MqttTransportSessionFactory, useClass: MqttTransportSessionFactoryImpl, asDefault: true },
        { provide: MQTT_SERV_OPTS, useValue: { ...defaultServOpts }, asDefault: true },
        MqttStatusVaildator,
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
export class MqttMicroServModule {

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
        /**
         * transport factory.
         */
        transportFactory?: ProvdierOf<MqttTransportSessionFactory>;
        /**
         * service options
         */
        serverOpts?: MqttServiceOpts;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }
    ): ModuleWithProviders<MqttMicroServModule> {

        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            {
                provide: MQTT_SERV_OPTS,
                useValue: {
                    ...defaultServOpts,
                    ...options.serverOpts,
                    providers: [...defaultServOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(MqttEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(MqttTransportSessionFactory, options.transportFactory))
        }


        return {
            module: MqttMicroServModule,
            providers
        }
    }

}


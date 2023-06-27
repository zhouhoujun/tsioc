import { StatusVaildator, createHandler } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, TransportBackend, TransportModule, RequestAdapter } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { MqttClient } from './client';
import { MqttHandler } from './handler';
import { MqttRequestAdapter } from './request';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS, MQTT_CLIENT_OPTS, MqttClientOpts, MqttClientsOpts } from './options';
import { MqttTransportSessionFactory, MqttTransportSessionFactoryImpl } from '../transport';
import { MqttStatusVaildator } from '../status';




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
    providers: [
        { provide: StatusVaildator, useExisting: MqttStatusVaildator },
        { provide: RequestAdapter, useExisting: MqttRequestAdapter }
    ]
} as MqttClientOpts;


/**
 * Mqtt Client Module.
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        MqttStatusVaildator,
        MqttRequestAdapter,
        { provide: MqttTransportSessionFactory, useClass: MqttTransportSessionFactoryImpl, asDefault: true },
        { provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: MqttHandler,
            useFactory: (injector: Injector, opts: MqttClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(MQTT_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, MQTT_CLIENT_OPTS]
        },
        MqttClient
    ]
})
export class MqttClientModule {

    /**
     * import mqtt micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: MqttClientOpts | MqttClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<MqttHandler>;

        transportFactory?: ProvdierOf<MqttTransportSessionFactory>;
    }): ModuleWithProviders<MqttClientModule> {

        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(MqttClient, [{ provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];
        if (options.handler) {
            providers.push(toProvider(MqttHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(MqttTransportSessionFactory, options.transportFactory))
        }

        return {
            module: MqttClientModule,
            providers
        }
    }

}

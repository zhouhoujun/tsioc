import { TransportSessionFactory, createHandler } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, TransportBackend, TransportModule, StatusVaildator, RequestAdapter } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { MqttClient } from './client';
import { MqttHandler } from './handler';
import { MqttRequestAdapter } from './request';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS, MQTT_CLIENT_OPTS, MqttClientOpts, MqttClientsOpts } from './options';
import { MqttTransportSessionFactory } from '../transport';
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
} as MqttClientOpts;



@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        MqttTransportSessionFactory,
        { provide: TransportSessionFactory, useExisting: MqttTransportSessionFactory, asDefault: true },
        { provide: StatusVaildator, useClass: MqttStatusVaildator },
        { provide: RequestAdapter, useClass: MqttRequestAdapter },
        { provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: MqttHandler,
            useFactory: (injector: Injector, opts: MqttClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken) {
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

        transportFactory?: ProvdierOf<TransportSessionFactory>;
    }): ModuleWithProviders<MqttClientModule> {

        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(MqttClient, [{ provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: MQTT_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }]
        ];
        if (options.handler) {
            providers.push(toProvider(MqttHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }

        return {
            module: MqttClientModule,
            providers
        }
    }

}

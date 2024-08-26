import { Module } from '@tsdi/ioc';
import { MqttClient } from './client/client';
import { MqttServer } from './server/server';
import { MqttConfiguration } from './configuration';


@Module({
    providers: [
        MqttClient,
        MqttServer,
        MqttConfiguration
        // {
        //     provide: CLIENT_MODULES,
        //     useValue: {
        //         transport: 'mqtt',
        //         clientType: MqttClient,
        //         hanlderType: MqttHandler,
        //         defaultOpts: {
        //             connectOpts: {
        //                 host: LOCALHOST,
        //                 port: 1883
        //             },
        //             encoding: 'utf8',
        //             interceptorsToken: MQTT_CLIENT_INTERCEPTORS,
        //             filtersToken: MQTT_CLIENT_FILTERS,
        //             transportOpts: {
        //                 delimiter: '#',
        //                 maxSize: defaultMaxSize,
        //             },
        //             // sessionFactory: { useExisting: TopicTransportSessionFactory },
        //         }
        //     } as ClientModuleOpts,
        //     multi: true
        // },
        // {
        //     provide: SERVER_MODULES,
        //     useValue: {
        //         transport: 'mqtt',
        //         microservice: true,
        //         serverType: MqttServer,
        //         handlerType: MqttRequestHandler,
        //         defaultOpts: {
        //             encoding: 'utf8',
        //             transportOpts: {
        //                 serverSide: true,
        //                 delimiter: '#',
        //                 maxSize: defaultMaxSize,
        //             },
        //             content: {
        //                 root: 'public',
        //                 prefix: 'content'
        //             },
        //             serverOpts: {
        //                 host: LOCALHOST,
        //                 port: 1883
        //             },
        //             detailError: true,
        //             interceptorsToken: MQTT_SERV_INTERCEPTORS,
        //             filtersToken: MQTT_SERV_FILTERS,
        //             guardsToken: MQTT_SERV_GUARDS,
        //             // sessionFactory: { useExisting: TopicTransportSessionFactory },
        //             filters: [
        //                 LoggerInterceptor,
        //                 ExecptionFinalizeFilter,
        //                 ExecptionHandlerFilter,
        //                 FinalizeFilter
        //             ]
        //         }
        //     } as ServerModuleOpts,
        //     multi: true
        // }
    ]
})
export class MqttModule {

}
import { RouterModule, TransformModule } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { RequestAdapter, StatusVaildator, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { KafkaClient } from './client/client';
import { KafkaServer } from './server/server';
import { KafkaTransportSessionFactory } from './transport';
import { KafkaRequestAdapter } from './client/request';
import { KafkaStatusVaildator } from './status';
import { KafkaExecptionHandlers } from './server/execption.handles';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        KafkaTransportSessionFactory,
        { provide: StatusVaildator, useClass: KafkaStatusVaildator },
        { provide: RequestAdapter, useClass: KafkaRequestAdapter },
        KafkaClient,

        KafkaExecptionHandlers,
        KafkaServer
    ]
})
export class KafkaModule {

}

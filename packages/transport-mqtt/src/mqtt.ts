import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { TransportModule } from '@tsdi/transport';
import { MqttClient } from './client/client';
import { MqttServer } from './server/server';


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

}

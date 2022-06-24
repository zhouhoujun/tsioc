import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { MqttClient } from './client/client';
import { MqttServer } from './server/server';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        MqttClient,
        MqttServer
    ]
})
export class MqttModule {

}

import { Module } from '@tsdi/ioc';
import { MqttClient } from './client/client';
import { MqttServer } from './server/server';
import { MqttConfiguration } from './configuration';


@Module({
    providers: [
        MqttConfiguration
    ],
    declarations: [
        MqttClient,
        MqttServer,
    ]
})
export class MqttModule {

}
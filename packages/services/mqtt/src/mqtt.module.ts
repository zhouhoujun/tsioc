import { Module } from '@tsdi/ioc';
import { MqttClient } from './client/client';
import { MqttServer } from './server/server';
import { MqttConfiguration } from './configuration';


@Module({
    providers: [
        MqttClient,
        MqttServer,
        MqttConfiguration
    ]
})
export class MqttModule {

}
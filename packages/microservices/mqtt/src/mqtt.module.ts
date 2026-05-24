import { Module, token } from '@tsdi/ioc';
import { MqttClient } from './client/client';
import { MqttServer } from './server/mqtt-server';

export const MQTT_SERV_INTERCEPTORS = token<any[]>('MQTT_SERV_INTERCEPTORS');
export const MQTT_SERV_FILTERS = token<any[]>('MQTT_SERV_FILTERS');
export const MQTT_SERV_GUARDS = token<any[]>('MQTT_SERV_GUARDS');

@Module({
    providers: [],
    declarations: [
        MqttClient,
        MqttServer
    ]
})
export class MqttModule {

}

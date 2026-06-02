import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import * as mqtt from 'mqtt';
import { MqttMessageAdapter } from './message-adapter';

@Injectable()
export class MqttMessageAdapterFactory extends MessageAdapterFactory<Record<string, any>, mqtt.MqttClient, MqttMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<Record<string, any>, mqtt.MqttClient>): MqttMessageAdapter {
        return new MqttMessageAdapter(options.request, options.response!);
    }
}

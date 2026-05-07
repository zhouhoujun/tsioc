import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import * as mqtt from 'mqtt';

export interface MqttClientOptions extends ClientOptions {
    transport: Transport.MQTT;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    connectOpts?: mqtt.IClientOptions;
    subscribeOpts?: { qos?: 0 | 1 | 2 };
    responseTopic?: string;
}

export const MQTT_CLIENT_OPTIONS = token<MqttClientOptions>('MQTT_CLIENT_OPTIONS');

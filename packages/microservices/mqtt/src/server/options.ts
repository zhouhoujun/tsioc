import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';
import * as mqtt from 'mqtt';

/**
 * MQTT server options for microservices.
 */
export interface MqttServOptions extends ServiceOptions {
    transport: Transport.MQTT;
    providers?: Provider[];
    /**
     * MQTT broker URL.
     */
    url?: string;
    /**
     * MQTT client connection options.
     */
    connectOpts?: mqtt.IClientOptions;
    /**
     * Topics to subscribe to.
     */
    subscribeTopics?: { topic: string; qos?: 0 | 1 | 2 }[];
}

export const MQTT_SERV_OPTIONS = token<MqttServOptions>('MQTT_SERV_OPTIONS');
export const MQTT_BIND_INTERCEPTORS = token<any[]>('MQTT_BIND_INTERCEPTORS');
export const MQTT_BIND_FILTERS = token<any[]>('MQTT_BIND_FILTERS');
export const MQTT_BIND_GUARDS = token<any[]>('MQTT_BIND_GUARDS');

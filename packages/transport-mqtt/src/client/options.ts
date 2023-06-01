import { Token, tokenId } from '@tsdi/ioc';
import { Interceptor, RequestOptions, TransportEvent, TransportRequest, ConfigableEndpointOptions, Filter, TransportSessionOpts } from '@tsdi/core';
import { Packet } from 'mqtt';
import { MqttConnectOpts } from '../connect';


export interface MqttClientOpts extends ConfigableEndpointOptions {
    connectOpts?: MqttConnectOpts;
    transportOpts?: TransportSessionOpts;
    timeout?: number;
}

export interface MqttClientsOpts extends MqttClientOpts {
    client: Token
}


export const MQTT_CLIENT_OPTS = tokenId<MqttClientOpts>('MQTT_CLIENT_OPTS');

/**
 * Mqtt client interceptors.
 */
export const MQTT_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_CLIENT_INTERCEPTORS');

/**
 * Mqtt client filters.
 */
export const MQTT_CLIENT_FILTERS = tokenId<Filter[]>('MQTT_CLIENT_FILTERS');

export type MqttReqOptions = Packet & RequestOptions;



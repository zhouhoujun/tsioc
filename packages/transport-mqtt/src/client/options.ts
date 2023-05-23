import { Token, tokenId } from '@tsdi/ioc';
import { Interceptor, RequestOptions, TransportEvent, TransportRequest, ConfigableEndpointOptions, Filter } from '@tsdi/core';
import { IClientOptions, Packet } from 'mqtt';


export interface MqttClientOpts extends ConfigableEndpointOptions {
    connectOpts: IClientOptions;
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



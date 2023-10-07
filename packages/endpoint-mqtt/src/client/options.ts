import { Token, tokenId } from '@tsdi/ioc';
import { Interceptor, Filter } from '@tsdi/core';
import { RequestOptions, TransportEvent, TransportRequest } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { Packet } from 'mqtt';
import { MqttConnectOpts } from '../connect';


export interface MqttClientOpts extends ClientOpts<MqttConnectOpts> {
    timeout?: number;
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



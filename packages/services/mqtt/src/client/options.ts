import { Token, tokenId } from '@tsdi/ioc';
import { Interceptor, Filter } from '@tsdi/core';
import { RequestOptions, ResponseEvent, ResponseTopic } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { Packet, QoS } from 'mqtt';
import { MqttConnectOpts } from '../connect';
import { MqttRequest } from './request';


export interface MqttClientOpts extends ClientOpts<MqttConnectOpts> {
    timeout?: number;
}


/**
 * Mqtt client interceptors.
 */
export const MQTT_CLIENT_INTERCEPTORS = tokenId<Interceptor<MqttRequest<any>, ResponseEvent<any>>[]>('MQTT_CLIENT_INTERCEPTORS');

/**
 * Mqtt client filters.
 */
export const MQTT_CLIENT_FILTERS = tokenId<Filter[]>('MQTT_CLIENT_FILTERS');

export interface MqttReqOptions extends RequestOptions, ResponseTopic {
    qos?: QoS
    dup?: boolean
    retain?: boolean
}



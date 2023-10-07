import { tokenId } from '@tsdi/ioc';
import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { ServerOpts } from '@tsdi/endpoints';
import { ContentOptions, MimeSource } from '@tsdi/endpoints/assets';
import { MqttConnectOpts } from '../connect';



export interface MqttServiceOpts extends ServerOpts<MqttConnectOpts> {
    detailError?: boolean;
    content?: ContentOptions;
    retryDelay?: number;
}

export const MQTT_SERV_OPTS = tokenId<MqttServiceOpts>('MQTT_SERV_OPTS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_SERV_INTERCEPTORS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_FILTERS = tokenId<Filter[]>('MQTT_SERV_FILTERS');

/**
 * MQTT Guards.
 */
export const MQTT_SERV_GUARDS = tokenId<CanActivate[]>('MQTT_SERV_GUARDS');

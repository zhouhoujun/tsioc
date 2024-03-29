import { tokenId } from '@tsdi/ioc';
import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { ServerOpts } from '@tsdi/endpoints';
import { MqttConnectOpts } from '../connect';



export interface MqttServiceOpts extends ServerOpts<MqttConnectOpts> {
    detailError?: boolean;
    retryDelay?: number;
}


/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_INTERCEPTORS = tokenId<Interceptor[]>('MQTT_SERV_INTERCEPTORS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_FILTERS = tokenId<Filter[]>('MQTT_SERV_FILTERS');

/**
 * MQTT Guards.
 */
export const MQTT_SERV_GUARDS = tokenId<CanActivate[]>('MQTT_SERV_GUARDS');

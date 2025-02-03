import { tokenId } from '@tsdi/ioc';
import { GuardLike, Filter, Interceptor } from '@tsdi/core';
import { ServerOpts } from '@tsdi/endpoints';
import { IClientSubscribeOptions } from 'mqtt';
import { MqttConnectOpts } from '../connect';



export interface MqttServiceOpts extends ServerOpts<MqttConnectOpts> {
    detailError?: boolean;
    retryDelay?: number;
    subscribeOptions?: IClientSubscribeOptions
    
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
export const MQTT_SERV_GUARDS = tokenId<GuardLike[]>('MQTT_SERV_GUARDS');

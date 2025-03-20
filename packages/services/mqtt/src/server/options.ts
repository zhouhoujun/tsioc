import { tokenId } from '@tsdi/ioc';
import { GuardLike, Filter, ApplicationInterceptor } from '@tsdi/core';
import { ServiceConfig } from '@tsdi/endpoints';
import { IClientSubscribeOptions, IClientPublishOptions } from 'mqtt';
import { MqttConnectOpts } from '../connect';


/**
 * mqtt service config.
 */
export interface MqttServConfig extends ServiceConfig<MqttConnectOpts> {
    detailError?: boolean;
    retryDelay?: number;
    subscribeOptions?: IClientSubscribeOptions;
    publishOptions?: IClientPublishOptions;
    
}


/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_INTERCEPTORS = tokenId<ApplicationInterceptor[]>('MQTT_SERV_INTERCEPTORS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_FILTERS = tokenId<Filter[]>('MQTT_SERV_FILTERS');

/**
 * MQTT Guards.
 */
export const MQTT_SERV_GUARDS = tokenId<GuardLike[]>('MQTT_SERV_GUARDS');

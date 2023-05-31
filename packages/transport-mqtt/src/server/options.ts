import { AssetContext, ExecptionFilter, Interceptor, TransportEvent, TransportRequest, TransportSessionOpts } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { TransportEndpointOptions } from '@tsdi/core';
import { IClientOptions } from 'mqtt';


export interface MqttClientOpts extends IClientOptions {
    url?: string;
}

export interface MqttServiceOpts extends TransportEndpointOptions<AssetContext> {
    connectOpts: MqttClientOpts;
    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    transportOpts?: TransportSessionOpts;
}

export const MQTT_SERV_OPTS = tokenId<MqttServiceOpts>('MQTT_SERV_OPTS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_SERV_INTERCEPTORS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_FILTERS = tokenId<ExecptionFilter[]>('MQTT_SERV_FILTERS');



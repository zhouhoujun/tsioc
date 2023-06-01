import { AssetContext, Filter, Interceptor, TransportEvent, TransportRequest, TransportSessionOpts } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { TransportEndpointOptions } from '@tsdi/core';
import { ContentOptions } from '@tsdi/transport';
import { MqttConnectOpts } from '../connect';



export interface MqttServiceOpts extends TransportEndpointOptions<AssetContext> {
    connectOpts?: MqttConnectOpts;
    detailError?: boolean;
    timeout?: number;
    content?: ContentOptions;
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
export const MQTT_SERV_FILTERS = tokenId<Filter[]>('MQTT_SERV_FILTERS');



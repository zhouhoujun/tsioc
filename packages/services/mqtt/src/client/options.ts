import { tokenId } from '@tsdi/ioc';
import { ApplicationInterceptor, Filter } from '@tsdi/core';
import { ResponseEvent, TopicRequestOptions } from '@tsdi/common';
import { ClientConfig } from '@tsdi/common/client';
import { QoS, UserProperties } from 'mqtt';
import { MqttConnectOpts } from '../connect';
import { MqttRequest } from './request';


/**
 * Mqtt client config.
 */
export interface MqttClientConfig extends ClientConfig<MqttConnectOpts> {
    
}


/**
 * Mqtt client interceptors.
 */
export const MQTT_CLIENT_INTERCEPTORS = tokenId<ApplicationInterceptor<MqttRequest<any>, ResponseEvent<any>>[]>('MQTT_CLIENT_INTERCEPTORS');

/**
 * Mqtt client filters.
 */
export const MQTT_CLIENT_FILTERS = tokenId<Filter[]>('MQTT_CLIENT_FILTERS');

export interface MqttReqOptions extends TopicRequestOptions {
    qos?: QoS;
    dup?: boolean;
    retain?: boolean;
    properties?: {
        payloadFormatIndicator?: boolean,
        messageExpiryInterval?: number,
        topicAlias?: number,
        responseTopic?: string,
        correlationData?: Buffer,
        userProperties?: UserProperties,
        subscriptionIdentifier?: number,
        contentType?: string
    }
}



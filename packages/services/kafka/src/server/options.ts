import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { TransportRequest } from '@tsdi/common';
import { ServerOpts } from '@tsdi/endpoints';
import { ContentOptions } from '@tsdi/endpoints/assets';
import { ConsumerConfig, KafkaConfig, ProducerConfig } from 'kafkajs';
import { KafkaTransportOpts } from '../transport';



export interface KafkaServerOptions extends ServerOpts<KafkaConfig> {
    postfixId?: string;
    consumer?: ConsumerConfig;
    producer?: ProducerConfig;
    keepBinary?: boolean;
    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    content?: ContentOptions;
    transportOpts?: KafkaTransportOpts;
}

export const KAFKA_SERV_OPTS = tokenId<KafkaServerOptions>('KAFKA_SERV_OPTIONS');

/**
 * Kafka server interceptors.
 */
export const KAFKA_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransitionEvent>[]>('KAFKA_SERV_INTERCEPTORS');

/**
 * Kafka server filters.
 */
export const KAFKA_SERV_FILTERS = tokenId<Filter[]>('KAFKA_SERV_FILTERS');

/**
 * Kafka Guards.
 */
export const KAFKA_SERV_GUARDS = tokenId<CanActivate[]>('KAFKA_SERV_GUARDS');

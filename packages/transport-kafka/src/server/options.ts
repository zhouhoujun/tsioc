import { CanActivate, Filter, Interceptor, TransportEndpointOptions, TransportRequest } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ContentOptions } from '@tsdi/transport';
import { ConsumerConfig, KafkaConfig, ProducerConfig } from 'kafkajs';
import { KafkaTransportOpts } from '../transport';
import { KafkaContext } from './context';



export interface KafkaServerOptions extends TransportEndpointOptions<KafkaContext> {
    postfixId?: string;
    connectOpts?: KafkaConfig;
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

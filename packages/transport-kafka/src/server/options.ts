import { CanActivate, Filter, Interceptor, TransportEndpointOptions, TransportRequest } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ContentOptions } from '@tsdi/transport';
import { ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopic, KafkaConfig, ProducerConfig, ProducerRecord } from 'kafkajs';
import { KafkaSessionOpts } from '../transport';
import { KafkaContext } from './context';



export interface KafkaServerOptions extends KafkaConfig, TransportEndpointOptions<KafkaContext> {
    postfixId?: string;
    connectOpts?: KafkaConfig;
    consumer?: ConsumerConfig;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    subscribe?: Omit<ConsumerSubscribeTopic, 'topic'>;
    producer?: ProducerConfig;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    keepBinary?: boolean;
    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    content?: ContentOptions;
    transportOpts?: KafkaSessionOpts;
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

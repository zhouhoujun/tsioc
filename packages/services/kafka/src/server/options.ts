import { GuardLike, Filter, Interceptor } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ServerOpts } from '@tsdi/endpoints';
import { ConsumerConfig, KafkaConfig, ProducerConfig } from 'kafkajs';
import { KafkaTransportOpts } from '../const';



export interface KafkaServerOptions extends ServerOpts<KafkaConfig> {
    postfixId?: string;
    consumer?: ConsumerConfig;
    producer?: ProducerConfig;
    keepBinary?: boolean;
    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    transportOpts?: KafkaTransportOpts;
}


/**
 * Kafka server interceptors.
 */
export const KAFKA_SERV_INTERCEPTORS = tokenId<Interceptor[]>('KAFKA_SERV_INTERCEPTORS');

/**
 * Kafka server filters.
 */
export const KAFKA_SERV_FILTERS = tokenId<Filter[]>('KAFKA_SERV_FILTERS');

/**
 * Kafka Guards.
 */
export const KAFKA_SERV_GUARDS = tokenId<GuardLike[]>('KAFKA_SERV_GUARDS');

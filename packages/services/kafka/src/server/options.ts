import { GuardLike, Filter, Interceptor } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ServiceConfig } from '@tsdi/endpoints';
import { ConsumerConfig, KafkaConfig, ProducerConfig, ConsumerRunConfig } from 'kafkajs';



/**
 * kafka service config.
 */
export interface KafkaServConfig extends ServiceConfig<KafkaConfig> {
    postfixId?: string;
    consumer?: ConsumerConfig;
    producer?: ProducerConfig;
    runConfig?:ConsumerRunConfig;
    fromBeginning?: boolean;
    
    keepBinary?: boolean;
    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
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

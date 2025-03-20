import { Token, tokenId } from '@tsdi/ioc';
import { Filter, ApplicationInterceptor } from '@tsdi/core';
import { Pattern, ResponseEvent } from '@tsdi/common';
import { ClientConfig } from '@tsdi/common/client';
import { ConsumerConfig, ConsumerRunConfig, KafkaConfig, ProducerConfig, ProducerRecord } from 'kafkajs';
import { KafkaRequest } from './request';

/**
 * Kafka client config.
 */
export interface KafkaClientConfig extends ClientConfig<KafkaConfig> {
    postfixId?: string;
    topics?: (Pattern | RegExp)[];
    consumer?: ConsumerConfig;
    producer?: ProducerConfig;
    consumerAssignments?: Record<string, number>;
    runConfig?: ConsumerRunConfig;
    fromBeginning?: boolean;

    publishOpts?: Omit<ProducerRecord, 'topic' | 'messages'>;

    keepBinary?: boolean;
    producerOnlyMode?: boolean;

    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

/**
 * Kafka client interceptors.
 */
export const KAFKA_CLIENT_INTERCEPTORS = tokenId<ApplicationInterceptor<KafkaRequest<any>, ResponseEvent<any>>[]>('KAFKA_CLIENT_INTERCEPTORS');
/**
 * Kafka client filters.
 */
export const KAFKA_CLIENT_FILTERS = tokenId<Filter[]>('KAFKA_CLIENT_FILTERS');

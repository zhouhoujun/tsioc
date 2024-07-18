import { Token, tokenId } from '@tsdi/ioc';
import { Filter, Interceptor } from '@tsdi/core';
import { Pattern, ResponseEvent } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { ConsumerConfig, KafkaConfig, ProducerConfig } from 'kafkajs';
import { KafkaTransportOpts } from '../const';
import { KafkaRequest } from './request';


export interface KafkaClientOpts extends ClientOpts<KafkaConfig> {
    postfixId?: string;
    topics?: (Pattern | RegExp)[];
    consumer?: ConsumerConfig;
    producer?: ProducerConfig;
    keepBinary?: boolean;
    producerOnlyMode?: boolean;

    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    transportOpts?: KafkaTransportOpts;
}

/**
 * Kafka client interceptors.
 */
export const KAFKA_CLIENT_INTERCEPTORS = tokenId<Interceptor<KafkaRequest<any>, ResponseEvent<any>>[]>('KAFKA_CLIENT_INTERCEPTORS');
/**
 * Kafka client filters.
 */
export const KAFKA_CLIENT_FILTERS = tokenId<Filter[]>('KAFKA_CLIENT_FILTERS');

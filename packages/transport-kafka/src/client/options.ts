import { Token, tokenId } from '@tsdi/ioc';
import { Client, ConfigableHandlerOptions, Filter, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import {
    ConsumerConfig, ConsumerSubscribeTopic, KafkaConfig,
    ProducerConfig, ProducerRecord
} from 'kafkajs';
import { ContentOptions } from '@tsdi/transport';
import { KafkaSessionOpts } from '../transport';


export interface KafkaClientOpts extends KafkaConfig, ConfigableHandlerOptions<TransportRequest> {
    postfixId?: string;
    connectOpts?: KafkaConfig;
    consumer?: ConsumerConfig;
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

export interface KafkaClientsOpts extends KafkaClientOpts {
    /**
     * client token.
     */
    client: Token<Client>;
}

/**
 * Kafka client opptions.
 */
export const KAFKA_CLIENT_OPTS = tokenId<KafkaClientOpts>('KAFKA_CLIENT_OPTS');

/**
 * Kafka client interceptors.
 */
export const KAFKA_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('KAFKA_CLIENT_INTERCEPTORS');
/**
 * Kafka client filters.
 */
export const KAFKA_CLIENT_FILTERS = tokenId<Filter[]>('KAFKA_CLIENT_FILTERS');

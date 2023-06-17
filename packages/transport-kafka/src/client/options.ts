import { Token, tokenId } from '@tsdi/ioc';
import { Client, ConfigableHandlerOptions, Filter, Interceptor, Pattern, TransportEvent, TransportRequest } from '@tsdi/core';
import { ConsumerConfig, KafkaConfig, ProducerConfig } from 'kafkajs';
import { ContentOptions } from '@tsdi/transport';
import { KafkaTransportOpts } from '../transport';


export interface KafkaClientOpts extends ConfigableHandlerOptions<TransportRequest> {
    postfixId?: string;
    topics?: (Pattern | RegExp)[]
    connectOpts?: KafkaConfig;
    consumer?: ConsumerConfig;
    producer?: ProducerConfig;
    keepBinary?: boolean;
    producerOnlyMode?: boolean;

    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    content?: ContentOptions;
    transportOpts?: KafkaTransportOpts;
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

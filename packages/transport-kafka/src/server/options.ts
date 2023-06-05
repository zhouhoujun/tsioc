import { TransportContext, TransportEndpointOptions } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ContentOptions } from '@tsdi/transport';
import { ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopic, KafkaConfig, ProducerConfig, ProducerRecord } from 'kafkajs';
import { KafkaSessionOpts } from '../transport';



export interface KafkaServerOptions extends KafkaConfig, TransportEndpointOptions<TransportContext> {
    postfixId?: string;
    client?: KafkaConfig;
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

export const KAFKA_SERV_OPTS = tokenId<KafkaServerOptions>('KAFKA_SERV_OPTIONS')
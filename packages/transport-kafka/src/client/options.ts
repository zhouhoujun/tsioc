import { tokenId } from '@tsdi/ioc';
import { ConfigableEndpointOptions, TransportSessionOpts } from '@tsdi/core';
import {
    ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopic, KafkaConfig,
    ProducerConfig, ProducerRecord
} from 'kafkajs';
import { ContentOptions } from '@tsdi/transport';
import { KafkaSessionOpts } from '../transport';


export interface KafkaClientOption extends KafkaConfig, ConfigableEndpointOptions {
    postfixId?: string;
    client?: KafkaConfig;
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

export const KAFKA_CLIENT_OPTS = tokenId<KafkaClientOption>('KAFKA_CLIENT_OPTS');

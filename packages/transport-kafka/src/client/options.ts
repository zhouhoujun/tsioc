import { tokenId } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import {
    ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopic, KafkaConfig,
    ProducerConfig, ProducerRecord
} from 'kafkajs';


export interface KafkaClientOption extends KafkaConfig, ConfigableEndpointOptions {
    postfixId?: string;
    client?: KafkaConfig;
    consumer?: ConsumerConfig;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    subscribe?: Omit<ConsumerSubscribeTopic, 'topic'>;
    producer?: ProducerConfig;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    keepBinary?: boolean;
}

export const KAFKA_CLIENT_OPTS = tokenId<KafkaClientOption>('KAFKA_CLIENT_OPTS');

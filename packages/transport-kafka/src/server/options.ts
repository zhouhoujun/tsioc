import { TransportContext, TransportEndpointOptions } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopic, KafkaConfig, ProducerConfig, ProducerRecord } from 'kafkajs';



export interface KafkaServerOptions extends KafkaConfig, TransportEndpointOptions<TransportContext> {
    postfixId?: string;
    client?: KafkaConfig;
    consumer?: ConsumerConfig;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    subscribe?: Omit<ConsumerSubscribeTopic, 'topic'>;
    producer?: ProducerConfig;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    keepBinary?: boolean;
}

export const KAFKA_SERV_OPTS = tokenId<KafkaServerOptions>('KAFKA_SERV_OPTIONS')
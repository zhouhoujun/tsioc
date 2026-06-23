import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import { Kafka } from 'kafkajs';

export interface KafkaClientOptions extends ClientOptions {
    transport: Transport.Kafka;
    side: TransferSide.client;
    microservice?: boolean;
    clientId?: string;
    brokers?: string[];
    responseTopicSuffix?: string;
    brokerCompatBrokers?: string[];
    kafkaFactory?: new (...args: any[]) => Kafka;
}

export const KAFKA_CLIENT_OPTIONS = token<KafkaClientOptions>('KAFKA_CLIENT_OPTIONS');

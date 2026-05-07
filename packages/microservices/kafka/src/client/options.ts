import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';

export interface KafkaClientOptions extends ClientOptions {
    transport: Transport.Kafka;
    side: TransferSide.client;
    microservice?: boolean;
    clientId?: string;
    brokers?: string[];
}

export const KAFKA_CLIENT_OPTIONS = token<KafkaClientOptions>('KAFKA_CLIENT_OPTIONS');

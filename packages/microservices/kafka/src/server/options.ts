import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';

export interface KafkaServOptions extends ServiceOptions {
    transport: Transport.Kafka;
    providers?: Provider[];
    clientId?: string;
    brokers?: string[];
    groupId?: string;
    topics?: { topic: string; fromBeginning?: boolean }[];
    fromBeginning?: boolean;
}

export const KAFKA_SERV_OPTIONS = token<KafkaServOptions>('KAFKA_SERV_OPTIONS');
export const KAFKA_BIND_INTERCEPTORS = token<any[]>('KAFKA_BIND_INTERCEPTORS');
export const KAFKA_BIND_FILTERS = token<any[]>('KAFKA_BIND_FILTERS');
export const KAFKA_BIND_GUARDS = token<any[]>('KAFKA_BIND_GUARDS');

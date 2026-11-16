import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';

export interface KafkaRetryOptions {
    /**
     * retries after the first failed attempt. default 0.
     */
    maxAttempts?: number;
    /**
     * delay between attempts in milliseconds. default 0.
     */
    delayMs?: number;
    /**
     * cap for exponential backoff. default `delayMs`.
     */
    maxDelayMs?: number;
}

export interface KafkaServOptions extends ServiceOptions {
    transport: Transport.Kafka;
    providers?: Provider[];
    clientId?: string;
    brokers?: string[];
    brokerCompatBrokers?: string[];
    groupId?: string;
    topics?: { topic: string; fromBeginning?: boolean }[];
    fromBeginning?: boolean;
    responseTopicSuffix?: string;
    /**
     * delivery guarantee. default `at-most-once` (kafkajs auto-commit).
     * `at-least-once` disables auto-commit and commits only after the handler
     * succeeds (or the message is dead-lettered), so a crash redelivers it.
     */
    delivery?: 'at-most-once' | 'at-least-once';
    /**
     * in-process retry before the offset is left uncommitted / dead-lettered.
     */
    retry?: KafkaRetryOptions;
    /**
     * partitions consumed concurrently. default: kafkajs default (1).
     */
    concurrency?: number;
    /**
     * topic that receives messages which exhausted their retry budget.
     * Requires `delivery: 'at-least-once'`.
     */
    deadLetterTopic?: string;
}

export const KAFKA_SERV_OPTIONS = token<KafkaServOptions>('KAFKA_SERV_OPTIONS');
export const KAFKA_BIND_INTERCEPTORS = token<any[]>('KAFKA_BIND_INTERCEPTORS');
export const KAFKA_BIND_FILTERS = token<any[]>('KAFKA_BIND_FILTERS');
export const KAFKA_BIND_GUARDS = token<any[]>('KAFKA_BIND_GUARDS');

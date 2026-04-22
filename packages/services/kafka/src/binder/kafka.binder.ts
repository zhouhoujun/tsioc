import { Injectable } from '@tsdi/ioc';
import { Observable, defer, of } from 'rxjs';
import { Transport, Pattern, patternToPath, Incoming } from '@tsdi/common';
import { AbstractBinder, ObservableBinding, ProducerBinding, BinderConfig, Binding, ConsumerOptions, ProducerOptions, BinderTypeRegistry } from '@tsdi/common';
import { BINDER_REGISTRY } from '@tsdi/common';

@Injectable()
export class KafkaBinder extends AbstractBinder<KafkaConsumerOptions, KafkaProducerOptions> {

    get name(): string {
        return 'kafka';
    }

    get transport(): Transport {
        return Transport.Kafka;
    }

    bindConsumer(name: string, group: string, options?: KafkaConsumerOptions): Binding<Observable<Incoming>> {
        const topic = options?.destination ?? name;
        const consumerGroup = options?.group ?? group;
        
        const binding = new ObservableBinding(topic, consumerGroup, async () => {
            this.log(`Unbinding Kafka consumer: ${topic}`);
        });

        this.log(`Binding Kafka consumer: ${topic}, group: ${consumerGroup}`);
        return binding;
    }

    bindProducer(name: string, options?: KafkaProducerOptions): Binding<(data: any) => Promise<void>> {
        const topic = options?.destination ?? name;
        
        const sendFn = async (data: any) => {
            const key = options?.partitionKey?.toString();
            const serialized = this.serialize(data);
            this.log(`Kafka: Sending to topic: ${topic}, key: ${key}`);
        };

        const binding = new ProducerBinding(topic, sendFn, async () => {
            this.log(`Unbinding Kafka producer: ${topic}`);
        });

        this.log(`Binding Kafka producer: ${topic}`);
        return binding;
    }

    send<TInput, TResult>(pattern: Pattern, data: TInput): Observable<TResult> {
        const topic = patternToPath(pattern);
        this.log(`Kafka: Sending request to topic: ${topic}`);
        
        return defer(() => {
            const mockResponse = this.deserialize<TResult>(Buffer.from(JSON.stringify({ ok: true, data })));
            return of(mockResponse);
        });
    }

    async emit<TInput>(pattern: Pattern, data: TInput): Promise<void> {
        const topic = patternToPath(pattern);
        const serialized = this.serialize({ pattern, data });
        this.log(`Kafka: Emitting event to topic: ${topic}`);
    }
}

export const KAFKA_BINDER_REGISTRY: BinderTypeRegistry = {
    name: 'kafka',
    transport: Transport.Kafka,
    type: KafkaBinder
};

export interface KafkaConsumerOptions extends ConsumerOptions {
    topic?: string;
    fromBeginning?: boolean;
    autoCommitInterval?: number;
    sessionTimeout?: number;
    maxPollInterval?: number;
}

export interface KafkaProducerOptions extends ProducerOptions {
    topic?: string;
    acks?: number;
    compression?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
    partition?: number;
}

export function registerKafkaBinder(): any[] {
    return [
        { provide: BINDER_REGISTRY, useValue: KAFKA_BINDER_REGISTRY },
        KafkaBinder
    ];
}

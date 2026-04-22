import { Injectable, Injector } from '@tsdi/ioc';
import { Observable, Subject, defer, from } from 'rxjs';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { Transport, Pattern, patternToPath, Incoming } from '@tsdi/common';
import { AbstractBinder, ObservableBinding, ProducerBinding } from '../binder.impl';
import { BinderConfig, Binding, ConsumerOptions, ProducerOptions } from '../binder';


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
            this.log(`Unbinding consumer: ${topic}`);
        });

        this.log(`Binding consumer: ${topic}, group: ${consumerGroup}`);
        return binding;
    }

    bindProducer(name: string, options?: KafkaProducerOptions): Binding<(data: any) => Promise<void>> {
        const topic = options?.destination ?? name;
        
        const sendFn = async (data: any) => {
            const key = options?.partitionKey;
            const serialized = this.serialize(data);
            this.log(`Sending to topic: ${topic}, key: ${key}`);
        };

        const binding = new ProducerBinding(topic, sendFn, async () => {
            this.log(`Unbinding producer: ${topic}`);
        });

        this.log(`Binding producer: ${topic}`);
        return binding;
    }

    send<TInput, TResult>(pattern: Pattern, data: TInput): Observable<TResult> {
        const topic = patternToPath(pattern);
        
        return defer(async () => {
            const serialized = this.serialize({ pattern, data });
            this.log(`Sending request to topic: ${topic}`);
            return serialized;
        }).pipe(
            mergeMap(() => {
                const responseSubject = new Subject<TResult>();
                setTimeout(() => {
                    const mockResponse = this.deserialize<TResult>(Buffer.from(JSON.stringify({ ok: true, data })));
                    responseSubject.next(mockResponse);
                    responseSubject.complete();
                }, 100);
                return responseSubject.asObservable();
            }),
            catchError(err => {
                this.logError('Send failed', err);
                throw err;
            })
        );
    }

    async emit<TInput>(pattern: Pattern, data: TInput): Promise<void> {
        const topic = patternToPath(pattern);
        const serialized = this.serialize({ pattern, data });
        this.log(`Emitting event to topic: ${topic}`);
    }
}

export interface KafkaConsumerOptions extends ConsumerOptions {
    topic?: string;
    fromBeginning?: boolean;
    autoCommitInterval?: number;
    sessionTimeout?: number;
}

export interface KafkaProducerOptions extends ProducerOptions {
    topic?: string;
    acks?: number;
    compression?: 'none' | 'gzip' | 'snappy';
}

@Injectable()
export class KafkaBinderFactory {
    constructor(private injector: Injector) {}
    
    create(config: BinderConfig): KafkaBinder {
        const binder = this.injector.get(KafkaBinder);
        binder.config = config;
        return binder;
    }
}
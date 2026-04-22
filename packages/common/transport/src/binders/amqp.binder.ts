import { Injectable, Injector } from '@tsdi/ioc';
import { Observable, Subject, from, defer } from 'rxjs';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { Transport, Pattern, Incoming, patternToPath } from '@tsdi/common';
import { AbstractBinder, ObservableBinding, ProducerBinding } from '../binder.impl';
import { BinderConfig, Binding, ConsumerOptions, ProducerOptions } from '../binder';


@Injectable()
export class AmqpBinder extends AbstractBinder<AmqpConsumerOptions, AmqpProducerOptions> {

    get name(): string {
        return 'amqp';
    }

    get transport(): Transport {
        return Transport.AMQP;
    }

    bindConsumer(name: string, group: string, options?: AmqpConsumerOptions): Binding<Observable<Incoming>> {
        const queueName = options?.destination ?? name;
        const binding = new ObservableBinding(queueName, group, async () => {
            this.log(`Unbinding consumer: ${queueName}`);
        });

        this.log(`Binding consumer: ${queueName}, group: ${group}`);
        return binding;
    }

    bindProducer(name: string, options?: AmqpProducerOptions): Binding<(data: any) => Promise<void>> {
        const exchangeName = options?.destination ?? name;
        
        const sendFn = async (data: any) => {
            const serialized = this.serialize(data);
            this.log(`Sending to exchange: ${exchangeName}`);
        };

        const binding = new ProducerBinding(exchangeName, sendFn, async () => {
            this.log(`Unbinding producer: ${exchangeName}`);
        });

        this.log(`Binding producer: ${exchangeName}`);
        return binding;
    }

    send<TInput, TResult>(pattern: Pattern, data: TInput): Observable<TResult> {
        const route = patternToPath(pattern);
        
        return defer(async () => {
            const serialized = this.serialize({ pattern, data });
            this.log(`Sending request to: ${route}`);
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
        const route = patternToPath(pattern);
        const serialized = this.serialize({ pattern, data });
        this.log(`Emitting event to: ${route}`);
    }
}

export interface AmqpConsumerOptions extends ConsumerOptions {
    exchange?: string;
    routingKey?: string;
    prefetch?: number;
    durable?: boolean;
    exclusive?: boolean;
}

export interface AmqpProducerOptions extends ProducerOptions {
    exchange?: string;
    routingKey?: string;
    persistent?: boolean;
    mandatory?: boolean;
}

@Injectable()
export class AmqpBinderFactory {
    constructor(private injector: Injector) {}
    
    create(config: BinderConfig): AmqpBinder {
        const binder = this.injector.get(AmqpBinder);
        binder.config = config;
        return binder;
    }
}
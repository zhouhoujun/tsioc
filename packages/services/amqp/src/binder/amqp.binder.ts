import { Injectable } from '@tsdi/ioc';
import { Observable, defer, of } from 'rxjs';
import { Transport, Pattern, patternToPath, Incoming } from '@tsdi/common';
import { AbstractBinder, ObservableBinding, ProducerBinding, BinderConfig, Binding, ConsumerOptions, ProducerOptions, BinderTypeRegistry } from '@tsdi/common';
import { BINDER_REGISTRY } from '@tsdi/common';

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
            this.log(`Unbinding AMQP consumer: ${queueName}`);
        });

        this.log(`Binding AMQP consumer: ${queueName}, group: ${group}`);
        return binding;
    }

    bindProducer(name: string, options?: AmqpProducerOptions): Binding<(data: any) => Promise<void>> {
        const exchangeName = options?.destination ?? name;
        
        const sendFn = async (data: any) => {
            const routingKey = options?.routingKey ?? '';
            const serialized = this.serialize(data);
            this.log(`AMQP: Sending to exchange: ${exchangeName}, routingKey: ${routingKey}`);
        };

        const binding = new ProducerBinding(exchangeName, sendFn, async () => {
            this.log(`Unbinding AMQP producer: ${exchangeName}`);
        });

        this.log(`Binding AMQP producer: ${exchangeName}`);
        return binding;
    }

    send<TInput, TResult>(pattern: Pattern, data: TInput): Observable<TResult> {
        const route = patternToPath(pattern);
        this.log(`AMQP: Sending request to: ${route}`);
        
        return defer(() => {
            const mockResponse = this.deserialize<TResult>(Buffer.from(JSON.stringify({ ok: true, data })));
            return of(mockResponse);
        });
    }

    async emit<TInput>(pattern: Pattern, data: TInput): Promise<void> {
        const route = patternToPath(pattern);
        const serialized = this.serialize({ pattern, data });
        this.log(`AMQP: Emitting event to: ${route}`);
    }
}

export const AMQP_BINDER_REGISTRY: BinderTypeRegistry = {
    name: 'amqp',
    transport: Transport.AMQP,
    type: AmqpBinder
};

export interface AmqpConsumerOptions extends ConsumerOptions {
    exchange?: string;
    routingKey?: string;
    prefetch?: number;
    durable?: boolean;
    exclusive?: boolean;
    noAck?: boolean;
}

export interface AmqpProducerOptions extends ProducerOptions {
    exchange?: string;
    routingKey?: string;
    persistent?: boolean;
    mandatory?: boolean;
}

export function registerAmqpBinder(): any[] {
    return [
        { provide: BINDER_REGISTRY, useValue: AMQP_BINDER_REGISTRY },
        AmqpBinder
    ];
}

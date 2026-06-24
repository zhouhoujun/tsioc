import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, TopicRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_CLIENT_OPTIONS, KafkaClientOptions } from './options';
import { KafkaRequest } from './request';

@Injectable()
export class KafkaClient extends AbstractClient<KafkaRequest<any>, ResponseEvent<any>, TopicRequestOptions> {

    private producer?: Producer;
    private kafka?: Kafka;

    constructor(
        readonly handler: ClientHandler<KafkaRequest<any>, ResponseEvent<any>>,
        @Inject(KAFKA_CLIENT_OPTIONS, { nullable: true }) private options: KafkaClientOptions
    ) { super(); }

    protected connect(): Observable<Producer> {
        return defer(async () => {
            if (this.producer) return this.producer;
            this.kafka = new Kafka({
                clientId: this.options.clientId || 'tsdi-client',
                brokers: this.options.brokerCompatBrokers?.length ? this.options.brokerCompatBrokers : (this.options.brokers || ['localhost:9092']),
            });
            this.producer = this.kafka.producer();
            await this.producer.connect();
            return this.producer;
        });
    }

    protected initContext(context: Context, req: KafkaRequest<any>): void {
        context.set(KafkaClient, this);
        context.set(KafkaRequest, req);
        context.set(SOCKET, this.producer as any);
    }

    protected buildRequest(first: KafkaRequest<any> | Pattern, options: RequestInitOpts<any, TopicRequestOptions>): KafkaRequest<any> {
        if (first instanceof KafkaRequest) return first;
        if (isString(first)) return new KafkaRequest(first, null, options);
        else return new KafkaRequest(this.handler.injector.get(PatternFormatter).format(first), first, options);
    }

    protected override request(first: Pattern | KafkaRequest<any>, options: TopicRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(switchMap(() => super.request(first, options)));
    }

    protected async onShutdown(): Promise<void> {
        if (this.producer) {
            await this.producer.disconnect();
        }
        this.producer = undefined;
        this.kafka = undefined;
    }

    protected isValid(_connection: Producer): boolean { return true; }
}

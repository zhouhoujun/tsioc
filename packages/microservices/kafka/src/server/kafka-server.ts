import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { createRequestContext, RequestContext, Transport, REQUEST } from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { KafkaServOptions, KAFKA_SERV_OPTIONS, KAFKA_BIND_INTERCEPTORS, KAFKA_BIND_FILTERS, KAFKA_BIND_GUARDS } from './options';
import { KafkaMessageAdapterFactory } from './message-adapter.factory';

@Injectable()
export class KafkaServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    consumer?: Consumer | null;
    producer?: Producer | null;
    private kafka?: Kafka;

    @InjectLog() logger!: Logger;
    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(KAFKA_SERV_OPTIONS, { nullable: true }) protected options: KafkaServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: KAFKA_BIND_INTERCEPTORS,
        filtersToken: KAFKA_BIND_FILTERS,
        guardsToken: KAFKA_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.consumer) return;
        await this.onStart();
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        try {
            this.kafka = new Kafka({
                clientId: this.options.clientId || 'tsdi-microservice',
                brokers: this.options.brokers || ['localhost:9092'],
            });

            this.consumer = this.kafka.consumer({ groupId: this.options.groupId || 'tsdi-group' });
            this.producer = this.kafka.producer();

            await this.consumer.connect();
            await this.producer.connect();

            this.logger.info(getTypeName(this), `connected to Kafka, brokers: ${(this.options.brokers || ['localhost:9092']).join(',')}`);

            const topics = this.options.topics || [{ topic: 'microservice' }];
            for (const t of topics) {
                await this.consumer.subscribe({ topic: t.topic, fromBeginning: t.fromBeginning ?? this.options.fromBeginning ?? false });
                this.logger.info(`Subscribed to Kafka topic '${t.topic}'`);
            }

            await this.consumer.run({
                eachMessage: async (payload: EachMessagePayload) => {
                    this.handleMessage(payload);
                }
            });

            if (!this.options.microservice) {
                await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.consumer, Transport.Kafka, this));
            }
        } catch (err) {
            this.logger.error('Failed to start Kafka server:', err);
            throw err;
        }
    }

    async onShutdown(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.consumer) { await this.consumer.disconnect(); this.consumer = null; }
        if (this.producer) { await this.producer.disconnect(); this.producer = null; }

    }

    private handleMessage(payload: EachMessagePayload) {
        const { topic, partition, message } = payload;
        const content = message.value?.toString() || '';

        let parsed: any;
        try { parsed = JSON.parse(content); } catch { parsed = content; }

        const requestSource = parsed && typeof parsed === 'object' ? parsed : {};
        const url = requestSource.url || topic;
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const requestData = {
            ...requestSource,
            url,
            method,
            body,
            payload: body,
            topic,
            partition,
            key: message.key?.toString(),
        };
        const context = createRequestContext(this.injector, [
            [REQUEST, requestData],
        ]);
        const adapter = this.injector.get(KafkaMessageAdapterFactory).create({ request: requestData, response: this.producer!, context });
        context.setMessageAdapter(adapter);
        context.setPayload(requestData);

        this.handler.handle(requestData as TReq, context)
            .pipe(takeUntil(race(this.destroy$).pipe(take(1))))
            .subscribe({
                next: (response: any) => {
                    adapter.sendResponse(response);
                },
                error: (err) => {
                    adapter.sendError(err);
                }
            });
    }
}

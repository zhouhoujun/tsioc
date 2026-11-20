import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { createRequestContext, RequestContext, Transport, REQUEST } from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent, getSubscribePatterns, mergeSubscribePatterns, watchSubscribePatterns, ConsumerRuntime, CONSUMER_METRICS, ConsumerMetricsSink } from '@tsdi/service';
import { Subject, race, take, takeUntil, lastValueFrom } from 'rxjs';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { KafkaServOptions, KAFKA_SERV_OPTIONS, KAFKA_BIND_INTERCEPTORS, KAFKA_BIND_FILTERS, KAFKA_BIND_GUARDS } from './options';
import { Router } from '@tsdi/service';
import { getServiceRouterToken } from '@tsdi/service';

@Injectable()
export class KafkaServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    consumer?: Consumer | null;
    producer?: Producer | null;
    private kafka?: Kafka;
    private stopRouteWatch?: () => void;
    private topicSignature = '';
    private restarting?: Promise<void>;

    @InjectLog() logger!: Logger;
    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(KAFKA_SERV_OPTIONS, { nullable: true }) protected options: KafkaServOptions,
        @Inject(CONSUMER_METRICS, { nullable: true }) protected consumerMetrics?: ConsumerMetricsSink | null,
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
                brokers: this.options.brokerCompatBrokers?.length ? this.options.brokerCompatBrokers : (this.options.brokers || ['localhost:9092']),
            });

            this.consumer = this.kafka.consumer({ groupId: this.options.groupId || 'tsdi-group' });
            this.producer = this.kafka.producer();

            await this.consumer.connect();
            await this.producer.connect();

            this.logger.info(getTypeName(this), `connected to Kafka, brokers: ${(this.options.brokerCompatBrokers?.length ? this.options.brokerCompatBrokers : (this.options.brokers || ['localhost:9092'])).join(',')}`);

            const topics = this.resolveTopics();
            this.topicSignature = this.topicsSignature(topics);
            for (const t of topics) {
                await this.consumer.subscribe({ topic: t.topic, fromBeginning: t.fromBeginning ?? this.options.fromBeginning ?? false });
                this.logger.info(`Subscribed to Kafka topic '${t.topic}'`);
            }

            await this.runConsumer(this.consumer);
            this.stopRouteWatch = watchSubscribePatterns(this.options, this.injector, () => {
                this.reconcileTopics().catch(err => {
                    this.logger.error('Kafka topic reconciliation error:', err);
                });
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
        this.stopRouteWatch?.();
        this.stopRouteWatch = undefined;
        this.destroy$.next();
        this.destroy$.complete();
        const stats = this.runtime?.stats();
        if (stats && (stats.completed || stats.failed || stats.retried)) {
            this.logger.info(
                `Kafka consumer drained: completed=${stats.completed} failed=${stats.failed} retried=${stats.retried}`
            );
        }
        if (this.consumer) { await this.consumer.disconnect(); this.consumer = null; }
        if (this.producer) { await this.producer.disconnect(); this.producer = null; }

    }

    private topicsSignature(topics: Array<{ topic: string | RegExp }>): string {
        return topics.map(item => String(item.topic)).sort().join('\u0000');
    }

    private runConsumer(consumer: Consumer): Promise<void> {
        return consumer.run({
            // At-least-once commits only after the handler succeeds; letting
            // kafkajs auto-commit would mark the offset as soon as the
            // callback resolves, which can skip a failed message.
            autoCommit: !this.isAtLeastOnce(),
            partitionsConsumedConcurrently: this.options.concurrency,
            eachMessage: async (payload: EachMessagePayload) => {
                await this.consumeMessage(payload);
            }
        });
    }

    private async reconcileTopics(): Promise<void> {
        if (!this.kafka || this.restarting) {
            return;
        }
        const topics = this.resolveTopics();
        const signature = this.topicsSignature(topics);
        if (signature === this.topicSignature) {
            return;
        }
        this.topicSignature = signature;
        this.restarting = (async () => {
            const previous = this.consumer;
            this.consumer = null;
            try {
                if (previous) {
                    await previous.disconnect();
                }
                if (!this.kafka || this.destroy$.isStopped) {
                    return;
                }
                const next = this.kafka.consumer({ groupId: this.options.groupId || 'tsdi-group' });
                await next.connect();
                for (const t of topics) {
                    await next.subscribe({ topic: t.topic, fromBeginning: t.fromBeginning ?? this.options.fromBeginning ?? false });
                }
                this.consumer = next;
                await this.runConsumer(next);
                this.logger.info(`Kafka consumer resubscribed to topics: ${topics.map(t => String(t.topic)).join(', ')}`);
            } catch (error) {
                this.consumer = null;
                throw error;
            }
        })();
        try {
            await this.restarting;
        } finally {
            this.restarting = undefined;
        }
    }

    private resolveTopics(): Array<{ topic: string | RegExp; fromBeginning?: boolean }> {
        const explicit = this.options.topics ?? [];
        const discovered = getSubscribePatterns(this.options, this.injector);
        const merged = mergeSubscribePatterns(
            explicit.map(item => item.topic),
            discovered,
            ['microservice']
        );
        const router = this.injector.get(getServiceRouterToken(this.options), null as Router | null);
        const wildcardTopics = router ? (router.routes as Array<{ path?: string; method?: string | string[]; subscribe?: boolean }>)
            .filter(route => {
                if (route.subscribe === true) {
                    return true;
                }
                if (route.subscribe === false) {
                    return false;
                }
                return !route.method;
            })
            .map(route => {
                if (typeof route.path !== 'string' || !router.formatter.isRegExp?.(route.path)) {
                    return undefined;
                }
                return router.formatter.parseRegExp?.(route.path) ?? undefined;
            })
            .filter((topic): topic is RegExp => !!topic) : [];

        const topics: Array<{ topic: string | RegExp; fromBeginning?: boolean }> = merged.map(topic => {
            const current = explicit.find(item => item.topic === topic);
            return current ?? { topic, fromBeginning: this.options.fromBeginning };
        });

        wildcardTopics.forEach(topic => {
            if (!topics.some(item => item.topic instanceof RegExp && String(item.topic) === String(topic))) {
                topics.push({ topic, fromBeginning: this.options.fromBeginning });
            }
        });

        return topics;
    }

    private isAtLeastOnce(): boolean {
        return this.options?.delivery === 'at-least-once';
    }

    private runtime?: ConsumerRuntime;

    private get consumerRuntime(): ConsumerRuntime {
        return this.runtime ??= new ConsumerRuntime({ retry: this.options?.retry, metrics: this.consumerMetrics ?? undefined, labels: { transport: 'kafka', group: this.options?.groupId } });
    }

    /**
     * Process one delivery through the shared consumer runtime: retry/backoff
     * happens in-process, and the offset is committed only when the runtime
     * reports success (or a dead-letter was published).
     */
    private async consumeMessage(payload: EachMessagePayload): Promise<void> {
        await this.consumerRuntime.handle({
            labels: { topic: payload.topic },
            payload,
            ack: () => this.isAtLeastOnce() ? this.commitOffset(payload) : undefined,
            fail: async (err) => {
                if (this.isAtLeastOnce() && this.options?.deadLetterTopic) {
                    await this.deadLetter(payload, err);
                    await this.commitOffset(payload);
                    return;
                }
                this.logger?.error('Kafka request handling error:', err);
                // Rethrow so kafkajs does not commit this offset: the message
                // is redelivered after restart/rebalance.
                throw err;
            }
        }, message => this.handleMessage(message.payload));
    }

    private async commitOffset(payload: EachMessagePayload): Promise<void> {
        if (!this.consumer) {
            return;
        }
        await this.consumer.commitOffsets([{
            topic: payload.topic,
            partition: payload.partition,
            offset: (Number(payload.message.offset) + 1).toString()
        }]);
    }

    /**
     * Publish an exhausted message to the dead-letter topic, preserving the
     * original payload and delivery metadata.
     */
    private async deadLetter(payload: EachMessagePayload, err: unknown): Promise<void> {
        if (!this.producer) {
            return;
        }
        const error = err instanceof Error ? err.message : String(err);
        await this.producer.send({
            topic: this.options.deadLetterTopic!,
            messages: [{
                key: payload.message.key,
                value: payload.message.value,
                headers: {
                    ...(payload.message.headers ?? {}),
                    'x-original-topic': payload.topic,
                    'x-original-partition': String(payload.partition),
                    'x-original-offset': payload.message.offset,
                    'x-error': error
                }
            }]
        });
    }

    private async handleMessage(payload: EachMessagePayload): Promise<void> {
        const context = createRequestContext(this.injector, [
            [REQUEST, payload as any],
        ]);

        await lastValueFrom(
            this.handler.handle(payload as TReq, context)
                .pipe(takeUntil(race(this.destroy$).pipe(take(1))))
        );
    }
}

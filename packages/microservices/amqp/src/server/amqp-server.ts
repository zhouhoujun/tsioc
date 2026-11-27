import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getSubscribePatterns, mergeSubscribePatterns, watchSubscribePatterns, ConsumerRuntime, CONSUMER_METRICS, ConsumerMetricsSink } from '@tsdi/service';
import { Subject, race, take, takeUntil, lastValueFrom } from 'rxjs';
import * as amqp from 'amqplib';
import { AmqpServOptions, AMQP_SERV_OPTIONS, AMQP_BIND_INTERCEPTORS, AMQP_BIND_FILTERS, AMQP_BIND_GUARDS } from './options';

/**
 * Header used to count application-level retries (RabbitMQ does not count
 * `nack(..., requeue=true)` redeliveries).
 */
const RETRY_HEADER = 'x-tsdi-retry-count';

/**
 * AMQP server for microservices.
 * Connects to AMQP broker and consumes messages from queue for handling.
 */
@Injectable()
export class AmqpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    connection: amqp.ChannelModel | null = null;
    channel: amqp.Channel | null = null;
    private starting?: Promise<void>;
    private queueName?: string;
    private retryQueue?: string;
    private consumerTag?: string;
    private stopRouteWatch?: () => void;
    private boundRoutingKeys = new Set<string>();
    private runtime?: ConsumerRuntime;
    @InjectLog() logger!: Logger;

    private get consumerRuntime(): ConsumerRuntime {
        return this.runtime ??= new ConsumerRuntime({
            idempotency: this.options?.idempotency,
            metrics: this.consumerMetrics ?? undefined,
            labels: { transport: 'amqp', group: this.options?.queue }
        });
    }

    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(AMQP_SERV_OPTIONS, { nullable: true }) protected options: AmqpServOptions,
        @Inject(CONSUMER_METRICS, { nullable: true }) protected consumerMetrics?: ConsumerMetricsSink | null,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: AMQP_BIND_INTERCEPTORS,
        filtersToken: AMQP_BIND_FILTERS,
        guardsToken: AMQP_BIND_GUARDS
    })
    async bind(event: BindServiceEvent<any>) {
        if (event.transport !== Transport.AMQP) return;
        if (this.connection) return;
        if (!this.starting) {
            this.starting = this.onStart().finally(() => {
                this.starting = undefined;
            });
        }
        await this.starting;
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        try {
            const url = this.options.url || 'amqp://127.0.0.1:5672';
            this.connection = await amqp.connect(withFrameMax(url, this.options?.frameMax));
            this.channel = await this.connection.createChannel();

            const exchange = this.options.exchange || 'tsdi';
            const exchangeType = this.options.exchangeType || 'topic';
            const queue = this.options.queue || '';
            const routingKeys = mergeSubscribePatterns(
                this.options.routingKey ? [this.options.routingKey] : undefined,
                getSubscribePatterns(this.options, this.injector),
                ['*.microservice']
            );

            await this.channel.assertExchange(exchange, exchangeType, { durable: true });
            const q = await this.channel.assertQueue(queue, { exclusive: !queue });
            this.queueName = q.queue;
            for (const routingKey of routingKeys) {
                await this.channel.bindQueue(q.queue, exchange, routingKey);
            }
            this.boundRoutingKeys = new Set(routingKeys);
            this.stopRouteWatch = watchSubscribePatterns(this.options, this.injector, () => {
                this.reconcileRoutingKeys().catch(err => {
                    this.logger.error('AMQP routing-key reconciliation error:', err);
                });
            });

            await this.declareRetryAndDeadLetter(q.queue, !!queue);

            if (this.options.prefetch) {
                await this.channel.prefetch(this.options.prefetch);
            }

            this.logger.info(getTypeName(this), `connected to AMQP broker, consuming from exchange: ${exchange}, routingKeys: ${routingKeys.join(',')}`);

            const consumed = await this.channel.consume(q.queue, (msg) => {
                if (!msg) {
                    return;
                }
                // Await the handler so processing failures are observed (and
                // retried/dead-lettered) instead of becoming unhandled
                // rejections while the delivery is silently acked.
                this.handleMessage(msg, exchange, msg.fields.routingKey).catch(err => {
                    this.logger.error('AMQP request handling error:', err);
                });
            }, { noAck: false });
            this.consumerTag = consumed?.consumerTag;

            (this.connection as amqp.ChannelModel).on(Events.CLOSE, () => {
                this.logger.info('AMQP connection closed');
            });

            (this.connection as amqp.ChannelModel).on(Events.ERROR, (err: Error) => {
                this.logger.error('AMQP connection error:', err);
            });

            if (!this.options.microservice) {
                await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.connection, Transport.AMQP, this));
            }
        } catch (err) {
            this.logger.error('Failed to start AMQP server:', err);
            throw err;
        }
    }

    async onShutdown(): Promise<void> {
        this.stopRouteWatch?.();
        this.stopRouteWatch = undefined;
        this.boundRoutingKeys.clear();
        this.destroy$.next();
        this.destroy$.complete();

        const channel = this.channel;
        const connection = this.connection;
        const runtime = this.runtime;
        const consumerTag = this.consumerTag;
        this.consumerTag = undefined;

        // Stop new deliveries first, then let in-flight handlers settle while
        // the channel still exists (the transfer hooks ack through it).
        if (channel && consumerTag) {
            try {
                await channel.cancel(consumerTag);
            } catch {
                // ignore cancel failures during shutdown
            }
        }
        if (runtime) {
            runtime.close();
            if (!(await runtime.drain(5_000))) {
                this.logger.error('AMQP consumer drain timed out after 5000ms');
            }
        }

        const stats = this.runtime?.stats();
        if (stats && (stats.completed || stats.failed || stats.retried)) {
            this.logger.info(
                `AMQP consumer drained: completed=${stats.completed} failed=${stats.failed} retried=${stats.retried}`
            );
        }

        this.channel = null;
        this.connection = null;
        this.queueName = undefined;
        this.retryQueue = undefined;

        if (channel) {
            try {
                await channel.close();
            } catch {
                // ignore channel close failures during shutdown
            }
        }
        if (connection) {
            try {
                await connection.close();
            } catch {
                // ignore connection close failures during shutdown
            }
        }
    }

    private async declareRetryAndDeadLetter(queue: string, durable: boolean): Promise<void> {
        const channel = this.channel;
        if (!channel) {
            return;
        }
        const retry = this.options.retry;
        if (retry && (retry.maxAttempts ?? 0) > 0) {
            const delay = retry.delayMs ?? 1000;
            if (delay > 0) {
                // TTL queue dead-letters back to the main queue after the delay.
                this.retryQueue = `${queue}.retry`;
                await channel.assertQueue(this.retryQueue, {
                    durable,
                    arguments: {
                        'x-message-ttl': delay,
                        'x-dead-letter-exchange': '',
                        'x-dead-letter-routing-key': queue
                    }
                });
            }
            this.logger.info(getTypeName(this), `retry enabled: maxAttempts=${retry.maxAttempts}, delayMs=${delay}`);
        }
        if (this.options.deadLetterQueue) {
            await channel.assertQueue(this.options.deadLetterQueue, { durable });
        }
    }

    /**
     * Decide what happens to a failed delivery: retry, dead-letter or nack.
     *
     * Runs from the broker transfer's `afterError` hook, so the original
     * message is always settled exactly once.
     */
    handleFailure(msg: amqp.ConsumeMessage): void {
        const channel = this.channel;
        if (!channel) {
            return;
        }
        const retry = this.options.retry;
        const maxAttempts = retry?.maxAttempts ?? 0;
        const attempts = Number(msg.properties?.headers?.[RETRY_HEADER] ?? 0);

        if (maxAttempts > 0 && attempts < maxAttempts) {
            const headers = { ...(msg.properties?.headers ?? {}), [RETRY_HEADER]: attempts + 1 };
            // Republish + ack because RabbitMQ does not expose a requeue count;
            // `nack(..., requeue=true)` cannot enforce a retry budget.
            channel.publish('', this.retryQueue ?? this.queueName!, msg.content, {
                ...msg.properties,
                headers
            });
            channel.ack(msg);
            return;
        }

        if (this.publishDeadLetter(msg)) {
            channel.ack(msg);
            return;
        }

        // Preserve broker-level DLX semantics when no application DLQ is set.
        channel.nack(msg, false, false);
    }

    private publishDeadLetter(msg: amqp.ConsumeMessage): boolean {
        const channel = this.channel;
        if (!channel) {
            return false;
        }
        if (this.options.deadLetterExchange) {
            channel.publish(
                this.options.deadLetterExchange,
                this.options.deadLetterRoutingKey ?? msg.fields.routingKey,
                msg.content,
                { ...msg.properties, headers: { ...(msg.properties?.headers ?? {}) } }
            );
            return true;
        }
        if (this.options.deadLetterQueue) {
            channel.publish('', this.options.deadLetterQueue, msg.content, {
                ...msg.properties,
                headers: { ...(msg.properties?.headers ?? {}) }
            });
            return true;
        }
        return false;
    }

    private async reconcileRoutingKeys(): Promise<void> {
        const channel = this.channel;
        const queue = this.queueName;
        if (!channel || !queue) {
            return;
        }
        const exchange = this.options.exchange || 'tsdi';
        const desired = new Set(mergeSubscribePatterns(
            this.options.routingKey ? [this.options.routingKey] : undefined,
            getSubscribePatterns(this.options, this.injector),
            ['*.microservice']
        ));
        for (const routingKey of desired) {
            if (this.boundRoutingKeys.has(routingKey)) {
                continue;
            }
            await channel.bindQueue(queue, exchange, routingKey);
            this.logger.info(`Bound AMQP routing key '${routingKey}'`);
        }
        for (const routingKey of this.boundRoutingKeys) {
            if (desired.has(routingKey)) {
                continue;
            }
            await channel.unbindQueue(queue, exchange, routingKey);
            this.logger.info(`Unbound AMQP routing key '${routingKey}'`);
        }
        this.boundRoutingKeys = desired;
    }

    private async handleMessage(msg: amqp.ConsumeMessage, _exchange: string, _routingKey: string): Promise<void> {
        // Broker-level settlement (ack/nack/retry/DLX) is owned by the AMQP
        // transfer hooks; the runtime adds unified accounting and the optional
        // concurrency limit without settling the message twice.
        await this.consumerRuntime.handle({
            id: this.messageId(msg),
            labels: { topic: msg.fields.routingKey },
            payload: msg,
            // Success acks run in the transfer hooks; only duplicates need an
            // explicit ack here.
            skip: () => { this.channel?.ack(msg); },
            // Rethrow so the consume callback logs/observes the failure; the
            // AMQP transfer hooks already nacked or dead-lettered the message.
            fail: (err) => { throw err; }
        }, message => this.handleRequest(message.payload));
    }

    private messageId(msg: amqp.ConsumeMessage): string | undefined {
        const properties = msg.properties as { messageId?: string; headers?: Record<string, any> } | undefined;
        const id = properties?.messageId ?? properties?.headers?.['x-tsdi-id'];
        return id == null || id === '' ? undefined : String(id);
    }

    private async handleRequest(msg: amqp.ConsumeMessage): Promise<void> {
        const context = createRequestContext(this.injector, [
            [REQUEST, msg as any],
        ]);

        await lastValueFrom(
            this.handler.handle(msg as TReq, context)
                .pipe(
                    takeUntil(race(this.destroy$).pipe(take(1)))
                )
        );
    }
}

function withFrameMax(url: string, frameMax?: number): string {
    try {
        const parsed = new URL(url);
        if (!parsed.searchParams.has('frameMax')) {
            parsed.searchParams.set('frameMax', String(frameMax ?? 16_384));
        }
        return parsed.toString();
    } catch {
        return url;
    }
}

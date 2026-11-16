import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getSubscribePatterns, mergeSubscribePatterns, ConsumerRuntime } from '@tsdi/service';
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

    connection: amqp.Connection | null = null;
    channel: amqp.Channel | null = null;
    private starting?: Promise<void>;
    private queueName?: string;
    private retryQueue?: string;
    private runtime?: ConsumerRuntime;
    @InjectLog() logger!: Logger;

    private get consumerRuntime(): ConsumerRuntime {
        return this.runtime ??= new ConsumerRuntime();
    }

    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(AMQP_SERV_OPTIONS, { nullable: true }) protected options: AmqpServOptions,
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
            this.connection = await amqp.connect(url);
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

            await this.declareRetryAndDeadLetter(q.queue, !!queue);

            if (this.options.prefetch) {
                await this.channel.prefetch(this.options.prefetch);
            }

            this.logger.info(getTypeName(this), `connected to AMQP broker, consuming from exchange: ${exchange}, routingKeys: ${routingKeys.join(',')}`);

            await this.channel.consume(q.queue, (msg) => {
                if (!msg) {
                    return;
                }
                // Await the handler so processing failures are observed (and
                // retried/dead-lettered) instead of becoming unhandled
                // rejections while the delivery is silently acked.
                this.handleMessage(msg, exchange, routingKeys[0]).catch(err => {
                    this.logger.error('AMQP request handling error:', err);
                });
            }, { noAck: false });

            (this.connection as amqp.Connection).on(Events.CLOSE, () => {
                this.logger.info('AMQP connection closed');
            });

            (this.connection as amqp.Connection).on(Events.ERROR, (err: Error) => {
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
        this.destroy$.next();
        this.destroy$.complete();

        const stats = this.runtime?.stats();
        if (stats && (stats.completed || stats.failed || stats.retried)) {
            this.logger.info(
                `AMQP consumer drained: completed=${stats.completed} failed=${stats.failed} retried=${stats.retried}`
            );
        }

        const channel = this.channel;
        const connection = this.connection;
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

    private async handleMessage(msg: amqp.ConsumeMessage, _exchange: string, _routingKey: string): Promise<void> {
        // Broker-level settlement (ack/nack/retry/DLX) is owned by the AMQP
        // transfer hooks; the runtime adds unified accounting and the optional
        // concurrency limit without settling the message twice.
        await this.consumerRuntime.handle({
            payload: msg,
            // Rethrow so the consume callback logs/observes the failure; the
            // AMQP transfer hooks already nacked or dead-lettered the message.
            fail: (err) => { throw err; }
        }, message => this.handleRequest(message.payload));
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

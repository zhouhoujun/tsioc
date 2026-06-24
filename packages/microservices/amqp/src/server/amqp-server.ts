import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as amqp from 'amqplib';
import { AmqpServOptions, AMQP_SERV_OPTIONS, AMQP_BIND_INTERCEPTORS, AMQP_BIND_FILTERS, AMQP_BIND_GUARDS } from './options';
import { AmqpMessageAdapterFactory } from './message-adapter.factory';

/**
 * AMQP server for microservices.
 * Connects to AMQP broker and consumes messages from queue for handling.
 */
@Injectable()
export class AmqpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    connection: amqp.Connection | null = null;
    channel: amqp.Channel | null = null;

    @InjectLog() logger!: Logger;

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
    async bind(_event: BindServiceEvent<any>) {
        if (this.connection) return;
        await this.onStart();
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
            const routingKey = this.options.routingKey || '*.microservice';

            await this.channel.assertExchange(exchange, exchangeType, { durable: true });
            const q = await this.channel.assertQueue(queue, { exclusive: !queue });
            await this.channel.bindQueue(q.queue, exchange, routingKey);
            if (routingKey !== '*.microservice') {
                await this.channel.bindQueue(q.queue, exchange, '*.microservice');
            }

            if (this.options.prefetch) {
                await this.channel.prefetch(this.options.prefetch);
            }

            this.logger.info(getTypeName(this), `connected to AMQP broker, consuming from exchange: ${exchange}, routingKey: ${routingKey}`);

            await this.channel.consume(q.queue, (msg) => {
                if (msg) {
                    this.handleMessage(msg, exchange, routingKey);
                }
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

        if (this.channel) {
            await this.channel.close();
            this.channel = null;
        }
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
    }

    private handleMessage(msg: amqp.ConsumeMessage, _exchange: string, _routingKey: string) {
        const content = msg.content.toString();

        let parsed: any;
        try {
            parsed = JSON.parse(content);
        } catch {
            parsed = content;
        }

        const routingKey = msg.fields.routingKey;
        const requestSource = parsed && typeof parsed === 'object' ? parsed : {};
        const topic = requestSource.topic ?? routingKey;
        const rawUrl = requestSource.url
            ?? (typeof requestSource.topic === 'string' && requestSource.topic.includes('/')
                ? requestSource.topic
                : undefined);
        const url = typeof rawUrl === 'string'
            ? rawUrl.replace(/^\/+/, '').replace(/\//g, '.')
            : undefined;
        const pattern = requestSource.pattern ?? topic;
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const requestData = {
            ...requestSource,
            url,
            topic,
            method,
            body,
            payload: body,
            replyTo: msg.properties.replyTo,
            correlationId: msg.properties.correlationId,
        };
        if (pattern !== undefined) {
            requestData.pattern = pattern;
        }

        const context = createRequestContext(this.injector, [
            [REQUEST, requestData],
        ]);
        const adapter = this.injector.get(AmqpMessageAdapterFactory).create({ request: requestData, response: this.channel!, context });
        context.setMessageAdapter(adapter);
        context.setPayload(requestData);

        this.handler.handle(requestData as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe({
                next: (response: any) => {
                    adapter.sendResponse(response);
                    this.channel?.ack(msg);
                },
                error: (err) => {
                    adapter.sendError(err);
                    this.channel?.nack(msg, false, false);
                }
            });
    }
}

import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST, RESPONSE, OutgoingFactory
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as amqp from 'amqplib';
import { AmqpServOptions, AMQP_SERV_OPTIONS, AMQP_BIND_INTERCEPTORS, AMQP_BIND_FILTERS, AMQP_BIND_GUARDS } from './options';

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

        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
        } catch (err) {
            this.logger?.error('AMQP shutdown error:', err);
        }
    }

    private handleMessage(msg: amqp.ConsumeMessage, exchange: string, _routingKey: string) {
        const content = msg.content.toString();

        let parsed: any;
        try {
            parsed = JSON.parse(content);
        } catch {
            parsed = content;
        }

        const routingKey = msg.fields.routingKey;
        const requestSource = parsed && typeof parsed === 'object' ? parsed : {};
        const url = requestSource.url || '/' + routingKey.replace(/\./g, '/');
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const requestData = {
            ...requestSource,
            url,
            method,
            body,
            payload: body,
        };

        const outgoing = this.injector.get(OutgoingFactory).create({});

        const context = createRequestContext(this.injector, [
            [REQUEST, requestData],
            [RESPONSE, outgoing],
            ['exchange', exchange],
            ['routingKey', routingKey],
            ['content', content],
        ]);
        context.setPayload(requestData);

        this.handler.handle(requestData as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe({
                next: (response: any) => {
                    if (response && this.channel) {
                        const ctxResponse = context.get(RESPONSE);
                        const body = ctxResponse?.body ?? response;
                        const replyTo = msg.properties.replyTo;
                        if (replyTo) {
                            const buf = Buffer.from(JSON.stringify({ payload: body }));
                            this.channel.sendToQueue(replyTo, buf, {
                                correlationId: msg.properties.correlationId
                            });
                        }
                    }
                    this.channel?.ack(msg);
                },
                error: () => {
                    this.channel?.nack(msg, false, false);
                }
            });
    }
}

import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getSubscribePatterns, mergeSubscribePatterns, ConsumerRuntime } from '@tsdi/service';
import { Subject, race, take, takeUntil, lastValueFrom } from 'rxjs';
import * as mqtt from 'mqtt';
import { MqttServOptions, MQTT_SERV_OPTIONS, MQTT_BIND_INTERCEPTORS, MQTT_BIND_FILTERS, MQTT_BIND_GUARDS } from './options';

/**
 * MQTT server for microservices.
 * Connects to MQTT broker and subscribes to topics for message handling.
 */
@Injectable()
export class MqttServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    client: mqtt.MqttClient | null = null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;
    private runtime?: ConsumerRuntime;

    private get consumerRuntime(): ConsumerRuntime {
        return this.runtime ??= new ConsumerRuntime({
            retry: this.options?.retry,
            concurrency: this.options?.concurrency
        });
    }

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(MQTT_SERV_OPTIONS, { nullable: true }) protected options: MqttServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: MQTT_BIND_INTERCEPTORS,
        filtersToken: MQTT_BIND_FILTERS,
        guardsToken: MQTT_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.client) return;
        await this.onStart();
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        const url = this.options.url || 'mqtt://127.0.0.1:1883';
        this.client = mqtt.connect(url);

        this.client.on(Events.CONNECT, () => {
            this.logger.info(getTypeName(this), 'connected to MQTT broker:', url);

            const topics = this.resolveSubscribeTopics();
            topics.forEach(({ topic, qos }) => {
                this.client?.subscribe(topic, { qos: qos ?? 0 }, (err) => {
                    if (err) {
                        this.logger.error(`Failed to subscribe to topic '${topic}':`, err);
                    } else {
                        this.logger.info(`Subscribed to topic '${topic}'`);
                    }
                });
            });
        });

        this.client.on(Events.MESSAGE, (topic: string, payload: Buffer, packet?: any) => {
            // mqtt.js ignores the callback return value, but awaiting keeps
            // handler failures observable (and counted) instead of unhandled.
            this.handleMessage(topic, payload, packet).catch(err => {
                this.logger.error('MQTT request handling error:', err);
            });
        });

        this.client.on(Events.ERROR, (err: Error) => {
            this.logger.error('MQTT client error:', err);
        });

        this.client.on(Events.CLOSE, () => {
            this.logger.info('MQTT client disconnected');
        });

        if (!this.options.microservice) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.client, Transport.MQTT, this));
        }
    }

    async onShutdown(): Promise<void> {
        if (!this.client) return;

        this.destroy$.next();
        this.destroy$.complete();

        const stats = this.runtime?.stats();
        if (stats && (stats.completed || stats.failed || stats.retried)) {
            this.logger.info(
                `MQTT consumer drained: completed=${stats.completed} failed=${stats.failed} retried=${stats.retried}`
            );
        }

        const client = this.client;
        await new Promise<void>((resolve) => {
            let settled = false;
            let timeout: NodeJS.Timeout | undefined;
            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = undefined;
                }
                client.removeAllListeners();
                resolve();
            };

            client.once(Events.CLOSE, finish);

            try {
                client.end(true, {}, finish);
            } catch {
                client.end(true);
                finish();
            }
            timeout = setTimeout(() => {
                try {
                    client.end(true);
                } finally {
                    finish();
                }
            }, 1000);
            if (typeof (timeout as any).unref === 'function') {
                (timeout as any).unref();
            }
        });
        this.client = null;

    }

    private resolveSubscribeTopics(): Array<{ topic: string; qos?: 0 | 1 | 2 }> {
        const explicit = this.options.subscribeTopics ?? [];
        const discovered = getSubscribePatterns(this.options, this.injector);
        const merged = mergeSubscribePatterns(
            explicit.map(item => item.topic),
            discovered,
            ['+/+/+']
        );

        return merged.map(topic => {
            const current = explicit.find(item => item.topic === topic);
            return current ?? { topic, qos: 0 };
        });
    }

    private async handleMessage(topic: string, payload: Buffer, packet?: any): Promise<void> {
        await this.consumerRuntime.handle({
            payload: { topic, payload, packet },
            fail: (err) => {
                if (this.options?.deadLetterTopic) {
                    this.client?.publish(this.options.deadLetterTopic, payload, { qos: 1 });
                    return;
                }
                throw err;
            }
        }, message => this.handleRequest(message.payload.topic, message.payload.payload, message.payload.packet));
    }

    private async handleRequest(topic: string, payload: Buffer, packet?: any): Promise<void> {
        // `packet` carries MQTT 5 user properties, which is where the trace
        // carrier lives; keeping it on the request lets tracing extract it.
        const request = { topic, payload, packet };
        const context = createRequestContext(this.injector, [
            [REQUEST, request as any],
        ]);

        await lastValueFrom(
            this.handler.handle(request as TReq, context)
                .pipe(
                    takeUntil(race(this.destroy$).pipe(take(1)))
                )
        );
    }
}

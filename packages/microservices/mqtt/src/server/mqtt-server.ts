import { getTypeName, Inject, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as mqtt from 'mqtt';
import { MqttServOptions, MQTT_SERV_OPTIONS, MQTT_BIND_INTERCEPTORS, MQTT_BIND_FILTERS, MQTT_BIND_GUARDS } from './options';

/**
 * MQTT server for microservices.
 * Acts as an MQTT client that subscribes to topics and handles incoming messages.
 */
@Injectable()
export class MqttServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    client?: mqtt.MqttClient | null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;

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

        const url = this.options.url || 'mqtt://localhost:1883';
        this.client = mqtt.connect(url, this.options.connectOpts);

        this.client.on(Events.CONNECT, () => {
            this.logger.info(getTypeName(this), 'connected to MQTT broker:', url);

            const topics = this.options.subscribeTopics || [{ topic: '+/+/+', qos: 0 as const }];
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

        this.client.on(Events.MESSAGE, (topic: string, payload: Buffer) => {
            this.handleMessage(topic, payload);
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

        await promisify(this.client.end.bind(this.client), this.client)(true)
            .catch(err => this.logger.error('MQTT client end error:', err));
        this.client.removeAllListeners();
        this.client = null;
    }

    private handleMessage(topic: string, payload: Buffer) {
        const data = payload.toString();
        const context = createRequestContext(this.injector, [
            ['topic', topic],
            ['payload', data],
        ]);

        let parsed: any;
        try {
            parsed = JSON.parse(data);
        } catch {
            parsed = data;
        }

        this.handler.handle(parsed as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe((response: any) => {
                if (response && this.client) {
                    const msg = typeof response === 'string' ? response : JSON.stringify(response);
                    this.client.publish(topic + '/response', msg);
                }
            });
    }
}

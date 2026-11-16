import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { connect, StringCodec, NatsConnection, Subscription } from 'nats';
import {
    createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getSubscribePatterns, mergeSubscribePatterns, ConsumerRuntime } from '@tsdi/service';
import { Subject, race, take, takeUntil, lastValueFrom } from 'rxjs';
import { NatsServOptions, NATS_SERV_OPTIONS, NATS_BIND_INTERCEPTORS, NATS_BIND_FILTERS, NATS_BIND_GUARDS } from './options';

/**
 * NATS server for microservices.
 * Connects to NATS and subscribes to subjects for message handling.
 */
@Injectable()
export class NatsServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    nc: NatsConnection | null = null;
    subscriptions: Subscription[] = [];
    private starting?: Promise<void>;
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
        @Inject(NATS_SERV_OPTIONS, { nullable: true }) protected options: NatsServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: NATS_BIND_INTERCEPTORS,
        filtersToken: NATS_BIND_FILTERS,
        guardsToken: NATS_BIND_GUARDS
    })
    async bind(event: BindServiceEvent<any>) {
        if (event.transport !== Transport.NATS) return;
        if (this.nc) return;
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
            const servers = this.options.url || 'nats://127.0.0.1:4222';
            this.nc = await connect({ servers });

            this.logger.info(getTypeName(this), 'connected to NATS:', this.options.url || 'nats://127.0.0.1:4222');

            const subjects = mergeSubscribePatterns(this.options.subjects, getSubscribePatterns(this.options, this.injector), ['>']);
            const sc = StringCodec();

            for (const subject of subjects) {
                const sub = this.nc.subscribe(subject, { queue: this.options.queue || 'microservices' });
                this.subscriptions.push(sub);

                (async () => {
                    for await (const msg of sub) {
                        try {
                            // Await before pulling the next message so handler
                            // failures are observed instead of becoming unhandled
                            // rejections, and processing stays ordered per subject.
                            await this.handleMessage(subject, msg.data, sc, msg);
                        } catch (err) {
                            this.logger.error('NATS request handling error:', err);
                        }
                    }
                })().catch(err => {
                    this.logger.error('NATS subscription error:', err);
                });

                this.logger.info(`Subscribed to NATS subject '${subject}'`);
            }

            this.nc.closed().then(() => {
                this.logger.info('NATS connection closed');
            }).catch(err => {
                this.logger.error('NATS connection closed with error:', err);
            });

            if (!this.options.microservice) {
                await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.nc, Transport.NATS, this));
            }
        } catch (err) {
            this.logger.error('Failed to start NATS server:', err);
            throw err;
        }
    }

    async onShutdown(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();

        const stats = this.runtime?.stats();
        if (stats && (stats.completed || stats.failed || stats.retried)) {
            this.logger.info(
                `NATS consumer drained: completed=${stats.completed} failed=${stats.failed} retried=${stats.retried}`
            );
        }

        this.subscriptions.forEach(sub => {
            try {
                sub.unsubscribe();
            } catch {
                // ignore unsubscribe errors during shutdown
            }
        });
        this.subscriptions = [];

        if (!this.nc) return;

        const connection = this.nc;
        this.nc = null;
        try {
            await connection.drain();
        } catch {
            // ignore drain failures during shutdown and force close below
        }
        try {
            await connection.close();
        } catch {
            // ignore close failures during shutdown
        }
    }

    private async handleMessage(subject: string, data: Uint8Array, sc: any, msg: any): Promise<void> {
        await this.consumerRuntime.handle({
            payload: { subject, data, sc, msg },
            fail: (err) => {
                if (this.options?.deadLetterSubject && this.nc) {
                    this.nc.publish(this.options.deadLetterSubject, data);
                    return;
                }
                throw err;
            }
        }, message => this.handleRequest(message.payload.subject, message.payload.data, message.payload.sc, message.payload.msg));
    }

    private async handleRequest(subject: string, data: Uint8Array, sc: any, msg: any): Promise<void> {
        const context = createRequestContext(this.injector, [
            [REQUEST, { subject, data, sc, msg } as any],
        ]);

        await lastValueFrom(
            this.handler.handle({ subject, data, sc, msg } as TReq, context)
                .pipe(
                    takeUntil(race(this.destroy$).pipe(take(1)))
                )
        );
    }
}

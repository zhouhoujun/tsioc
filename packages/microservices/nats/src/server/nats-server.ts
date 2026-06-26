import { getTypeName, Inject, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { connect, StringCodec, NatsConnection, Subscription } from 'nats';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getSubscribePatterns, mergeSubscribePatterns } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import { NatsServOptions, NATS_SERV_OPTIONS, NATS_BIND_INTERCEPTORS, NATS_BIND_FILTERS, NATS_BIND_GUARDS } from './options';

/**
 * NATS server for microservices.
 * Connects to NATS and subscribes to subjects for message handling.
 */
@Injectable()
export class NatsServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    nc: NatsConnection | null = null;
    subscriptions: Subscription[] = [];

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;

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
    async bind(_event: BindServiceEvent<any>) {
        if (this.nc) return;
        await this.onStart();
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
                        this.handleMessage(subject, msg.data, sc, msg);
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

        this.subscriptions = [];

        if (this.nc) {
            await this.nc.drain();
            await this.nc.close();
            this.nc = null;
        }
    }

    private handleMessage(subject: string, data: Uint8Array, sc: any, msg: any) {
        const context = createRequestContext(this.injector, [
            [REQUEST, { subject, data, sc, msg } as any],
        ]);

        this.handler.handle({ subject, data, sc, msg } as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe();
    }
}

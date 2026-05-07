import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    createRequestContext, RequestContext, Transport
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import { connect, NatsConnection, StringCodec, Subscription } from 'nats';
import { NatsServOptions, NATS_SERV_OPTIONS, NATS_BIND_INTERCEPTORS, NATS_BIND_FILTERS, NATS_BIND_GUARDS } from './options';

/**
 * NATS server for microservices.
 * Connects to NATS and subscribes to subjects for message handling.
 */
@Injectable()
export class NatsServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    nc?: NatsConnection | null;
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
            const servers = this.options.servers || [this.options.url || 'nats://localhost:4222'];
            this.nc = await connect({ servers });

            this.logger.info(getTypeName(this), 'connected to NATS:', servers.join(', '));

            const subjects = this.options.subjects || ['microservice.>'];
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
            try {
                await this.nc.drain();
                await this.nc.close();
            } catch (err) {
                this.logger?.error('NATS shutdown error:', err);
            }
            this.nc = null;
        }
    }

    private handleMessage(subject: string, data: Uint8Array, sc: any, msg: any) {
        const content = sc.decode(data);
        const context = createRequestContext(this.injector, [
            ['subject', subject],
            ['content', content],
        ]);

        let parsed: any;
        try {
            parsed = JSON.parse(content);
        } catch {
            parsed = content;
        }

        this.handler.handle(parsed as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe((response: any) => {
                if (response && msg.respond) {
                    const buf = sc.encode(
                        typeof response === 'string' ? response : JSON.stringify(response)
                    );
                    msg.respond(buf);
                }
            });
    }
}

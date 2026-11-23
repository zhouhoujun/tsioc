import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { connect, StringCodec, NatsConnection, Subscription, JetStreamSubscription, JsMsg } from 'nats';
import {
    createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getSubscribePatterns, mergeSubscribePatterns, watchSubscribePatterns, ConsumerRuntime, CONSUMER_METRICS, ConsumerMetricsSink } from '@tsdi/service';
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
    private subjectSubscriptions = new Map<string, Subscription>();
    private stopRouteWatch?: () => void;
    private starting?: Promise<void>;
    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;
    private runtime?: ConsumerRuntime;
    private jsSub?: JetStreamSubscription;
    private jsLoop?: Promise<void>;
    private jsFilter?: string;

    private get consumerRuntime(): ConsumerRuntime {
        return this.runtime ??= new ConsumerRuntime({
            metrics: this.consumerMetrics ?? undefined,
            labels: { transport: 'nats' },
            retry: this.options?.retry,
            concurrency: this.options?.concurrency,
            idempotency: this.options?.idempotency
        });
    }

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(NATS_SERV_OPTIONS, { nullable: true }) protected options: NatsServOptions,
        @Inject(CONSUMER_METRICS, { nullable: true }) protected consumerMetrics?: ConsumerMetricsSink | null,
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
            this.jsFilter = this.options.delivery === 'jetstream'
                ? (this.options.jetstreamSubject ?? subjects[0])
                : undefined;
            for (const subject of subjects) {
                this.subscribeSubject(subject);
            }
            this.stopRouteWatch = watchSubscribePatterns(this.options, this.injector, () => {
                this.reconcileSubjects();
            });

            if (this.options.delivery === 'jetstream') {
                await this.startJetStream(this.jsFilter ?? '>');
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
        this.stopRouteWatch?.();
        this.stopRouteWatch = undefined;
        this.subjectSubscriptions.clear();
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

        try {
            this.jsSub?.unsubscribe();
        } catch {
            // ignore unsubscribe errors during shutdown
        }
        this.jsSub = undefined;

        const runtime = this.runtime;
        if (runtime) {
            runtime.close();
            if (!(await runtime.drain(5_000))) {
                this.logger.error('NATS consumer drain timed out after 5000ms');
            }
        }

        if (this.jsLoop) {
            const loop = this.jsLoop;
            this.jsLoop = undefined;
            await Promise.race([
                loop.catch(() => undefined),
                new Promise<void>(resolve => {
                    const timer = setTimeout(resolve, 5000);
                    if (typeof (timer as any).unref === 'function') {
                        (timer as any).unref();
                    }
                })
            ]);
        }

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

    private subscribeSubject(subject: string): void {
        if (!this.nc || this.subjectSubscriptions.has(subject)) {
            return;
        }
        // In JetStream mode the event subject is consumed by the durable
        // consumer; a core subscription would run the handler twice.
        if (this.jsFilter && subject === this.jsFilter) {
            return;
        }
        const sub = this.nc.subscribe(subject, { queue: this.options.queue || 'microservices' });
        this.subjectSubscriptions.set(subject, sub);
        this.subscriptions.push(sub);
        const sc = StringCodec();

        (async () => {
            for await (const msg of sub) {
                try {
                    // Await before pulling the next message so handler failures
                    // are observed instead of becoming unhandled rejections.
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

    private reconcileSubjects(): void {
        if (!this.nc) {
            return;
        }
        const desired = new Set(mergeSubscribePatterns(
            this.options.subjects,
            getSubscribePatterns(this.options, this.injector),
            ['>']
        ));
        for (const subject of desired) {
            this.subscribeSubject(subject);
        }
        for (const [subject, sub] of this.subjectSubscriptions) {
            if (desired.has(subject)) {
                continue;
            }
            try {
                sub.unsubscribe();
            } catch {
                // ignore unsubscribe errors
            }
            this.subjectSubscriptions.delete(subject);
            this.subscriptions = this.subscriptions.filter(item => item !== sub);
            this.logger.info(`Unsubscribed from NATS subject '${subject}'`);
        }
    }

    private async handleMessage(subject: string, data: Uint8Array, sc: any, msg: any): Promise<void> {
        await this.consumerRuntime.handle({
            labels: { topic: subject },
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

    private async startJetStream(filter: string): Promise<void> {
        const connection = this.nc;
        if (!connection) {
            return;
        }
        const stream = this.options.stream ?? 'TSDI';
        const durable = this.options.durable ?? this.options.queue ?? 'tsdi';
        const maxDeliver = Math.max(1, this.options.maxDeliver ?? 5);
        const ackWaitMs = Math.max(1000, this.options.ackWaitMs ?? 30_000);
        const streamSubjects = this.options.streamSubjects?.length
            ? this.options.streamSubjects
            : [filter];

        const jsm = await connection.jetstreamManager();
        try {
            await jsm.streams.info(stream);
        } catch {
            await jsm.streams.add({ name: stream, subjects: streamSubjects });
            this.logger.info(`NATS JetStream stream '${stream}' created for ${streamSubjects.join(',')}`);
        }

        const js = connection.jetstream();
        // A durable push consumer needs a stable deliver subject; deriving it
        // from stream+durable keeps reconnects bound to the same consumer.
        const deliverSubject = `tsdi.js.${stream}.${durable}`;
        const sub = await js.subscribe(filter, {
            stream,
            config: {
                durable_name: durable,
                deliver_subject: deliverSubject,
                filter_subject: filter,
                ack_wait: ackWaitMs * 1_000_000,
                max_deliver: maxDeliver
            },
            mack: true,
            queue: this.options.queue || undefined
        });
        this.jsSub = sub;
        this.logger.info(`NATS JetStream consumer '${durable}' subscribed to '${filter}' on '${stream}'`);

        this.jsLoop = (async () => {
            for await (const msg of sub) {
                await this.handleJetStreamMessage(msg);
            }
        })().catch(err => {
            if (!this.destroy$.isStopped) {
                this.logger.error('NATS JetStream subscription error:', err);
            }
        });
    }

    private async handleJetStreamMessage(msg: JsMsg): Promise<void> {
        const info = msg.info;
        const id = info ? `${info.stream}:${info.streamSequence}` : undefined;
        const sc = StringCodec();
        const maxDeliver = Math.max(1, this.options.maxDeliver ?? 5);
        await this.consumerRuntime.handle({
            id,
            labels: { topic: msg.subject },
            payload: { subject: msg.subject, data: msg.data, sc, msg },
            ack: () => { msg.ack(); },
            skip: () => { msg.ack(); },
            fail: () => {
                if (this.options.deadLetterSubject && this.nc) {
                    this.nc.publish(this.options.deadLetterSubject, msg.data);
                    msg.ack();
                    return;
                }
                if ((info?.redeliveryCount ?? 0) + 1 >= maxDeliver) {
                    // Exhausted: stop redelivery instead of looping forever.
                    msg.term();
                } else {
                    msg.nak();
                }
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

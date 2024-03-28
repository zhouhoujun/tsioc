import { Execption, Inject, Injectable } from '@tsdi/ioc';
import { PatternFormatter, LOCALHOST } from '@tsdi/common';
import { MircoServRouters, RequestHandler, Server } from '@tsdi/endpoints';
import { ev } from '@tsdi/common/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import Redis from 'ioredis';
import { RedisEndpointHandler } from './handler';
import { REDIS_SERV_OPTS, RedisServerOpts } from './options';
import { RedisTransportSession, RedisTransportSessionFactory } from '../redis.session';
import { Subject, first, fromEvent, merge } from 'rxjs';

/**
 * Redis Server.
 */
@Injectable()
export class RedisServer extends Server {

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;
    private _session?: RedisTransportSession;

    private subscriber: Redis | null = null;
    private publisher: Redis | null = null;

    constructor(
        readonly handler: RedisEndpointHandler,
        @Inject(REDIS_SERV_OPTS) private options: RedisServerOpts
    ) {
        super();
        this.destroy$ = new Subject();
    }

    protected async connect(): Promise<any> {
        const opts = this.options;
        const retryStrategy = opts.serverOpts?.retryStrategy ?? this.createRetryStrategy(opts);
        const options = this.options.serverOpts = {
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.serverOpts,
            lazyConnect: true
        };

        const subscriber = this.subscriber = new Redis(options);
        this.subscriber.on(ev.ERROR, (err) => this.logger.error(err));

        const publisher = this.publisher = new Redis(options);
        this.publisher.on(ev.ERROR, (err) => this.logger.error(err));

        await Promise.all([
            subscriber.connect(),
            publisher.connect()
        ]);

    }

    protected async onStart(): Promise<any> {
        await this.connect();
        if (!this.subscriber || !this.publisher) throw new Execption('Subscriber and Publisher cannot be null');

        const subscriber = this.subscriber;
        const publisher = this.publisher;

        const injector = this.handler.injector;

        const transportOpts = this.options.transportOpts!;
        if (!transportOpts.transport) {
            transportOpts.transport = 'redis';
        }

        const factory = injector.get(RedisTransportSessionFactory);
        const session = this._session = factory.create({
            subscriber,
            publisher
        }, transportOpts);

        const router = injector.get(MircoServRouters).get('redis');
        if (this.options.content?.prefix) {
            const content = injector.get(PatternFormatter).format(`${this.options.content.prefix}/**`);
            router.matcher.register(content, true);
        }
        const routes = router.matcher.getPatterns();

        const subscribes: string[] = [];
        const psubscribes: string[] = [];
        routes.forEach(r => router.matcher.isPattern(r) ? psubscribes.push(r) : subscribes.push(r));
        await this.subscriber.subscribe(...subscribes, (err, count) => {
            if (err) {
                // Just like other commands, subscribe() can fail for some reasons,
                // ex network issues.
                this.logger.error("Failed to subscribe: %s", err.message);
            } else {
                // `count` represents the number of channels this server are currently subscribed to.
                this.logger.info(
                    `Subscribed successfully! This server is currently subscribed to ${count} channels.`,
                    subscribes
                );
            }
        });

        await this.subscriber.psubscribe(...psubscribes, (err, count) => {
            if (err) {
                // Just like other commands, subscribe() can fail for some reasons,
                // ex network issues.
                this.logger.error("Failed to subscribe: %s", err.message);
            } else {
                // `count` represents the number of channels this server are currently subscribed to.
                this.logger.info(
                    `Subscribed successfully! This server is currently subscribed to ${count} pattern channels.\n`,
                    psubscribes
                );
            }
        });

        session.listen(this.handler, merge(this.destroy$, fromEvent(this.subscriber, ev.ERROR)).pipe(first()))
        // injector.get(RequestHandler).handle(this.handler, session, this.logger, this.options);

        router.matcher.eachPattern((topic, pattern) => {
            if (topic !== pattern) {
                this.logger.info('Transform pattern', pattern, 'to topic', topic)
            }
        });
    }

    protected async onShutdown(): Promise<any> {
        await this._session?.destroy();
        this.destroy$.next();
        this.destroy$.complete();
        this.publisher = this.subscriber = null;
        this.logger.info(`Redis microservice closed!`);
    }

    protected createRetryStrategy(options: RedisServerOpts): (times: number) => undefined | number {
        return (times: number) => {
            const retryAttempts = options.retryAttempts;
            if (!retryAttempts || times > retryAttempts) {
                this.logger.error('Retry time exhausted');
                return;
            }

            return options.retryDelay ?? 0;
        }
    }

}

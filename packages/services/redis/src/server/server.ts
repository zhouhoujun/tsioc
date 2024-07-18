import { Execption, Injectable } from '@tsdi/ioc';
import { PatternFormatter, LOCALHOST } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { MircoServRouters, RequestContext, Server, TransportSession, TransportSessionFactory } from '@tsdi/endpoints';
import { ev } from '@tsdi/common/transport';
import Redis from 'ioredis';
import { RedisRequestHandler } from './handler';
import { RedisServerOpts } from './options';
import { Subject, first, fromEvent, merge } from 'rxjs';
import { ReidsSocket } from '../message';

/**
 * Redis Server.
 */
@Injectable()
export class RedisServer extends Server<RequestContext, RedisServerOpts> {

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;
    private _session?: TransportSession<ReidsSocket>;

    private subscriber: Redis | null = null;
    private publisher: Redis | null = null;

    constructor(readonly handler: RedisRequestHandler) {
        super();
        this.destroy$ = new Subject();
    }

    protected async connect(): Promise<any> {
        const opts = this.getOptions();
        const retryStrategy = opts.serverOpts?.retryStrategy ?? this.createRetryStrategy(opts);
        const options = opts.serverOpts = {
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

        const options = this.getOptions();

        const subscriber = this.subscriber;
        const publisher = this.publisher;

        const injector = this.handler.injector;

        const transportOpts = options.transportOpts!;

        const factory = injector.get(TransportSessionFactory);
        const session = this._session = factory.create(injector, {
            subscriber,
            publisher
        }, transportOpts);

        const router = injector.get(MircoServRouters).get('redis');
        if (options.content?.prefix) {
            const content = injector.get(PatternFormatter).format(`${options.content.prefix}/**`);
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
        
        this.publisher?.quit();
        this.publisher?.removeAllListeners();
        this.subscriber?.quit();
        this.subscriber?.removeAllListeners();
        
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

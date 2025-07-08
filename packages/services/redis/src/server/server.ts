import { Exception, Injectable } from '@tsdi/ioc';
import { PatternFormatter, LOCALHOST, defaultFormatter } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { getRouter, RequestContext, Server, ServerTransport, ServerTransportFactory } from '@tsdi/endpoints';
import { ev } from '@tsdi/common/transport';
import Redis from 'ioredis';
import { RedisRequestHandler } from './handler';
import { RedisServConfig } from './options';
import { Subject, first, fromEvent, merge } from 'rxjs';
import { ReidsSocket } from '../socket';

/**
 * Redis Server.
 */
@Injectable()
export class RedisServer extends Server<RequestContext, RedisServConfig> {

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;
    private _transport?: ServerTransport<ReidsSocket>;

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
        if (!this.subscriber || !this.publisher) throw new Exception('Subscriber and Publisher cannot be null');

        const options = this.getOptions();

        const subscriber = this.subscriber;
        const publisher = this.publisher;

        const injector = this.handler.injector;

        const factory = injector.get(ServerTransportFactory);
        const transport = this._transport = factory.create(injector, {
            subscriber,
            publisher
        }, options);

        const router = getRouter(injector, options.protocol ?? 'redis', true);
        
        const {paths, patterns} = router.getPatterns();

        if (options.content?.prefix) {
            const content = router.formatter.format(`${options.content.prefix}.*`);
            patterns.push(content);
        }

        if (paths.length) {
            await this.subscriber.subscribe(...paths, (err, count) => {
                if (err) {
                    // Just like other commands, subscribe() can fail for some reasons,
                    // ex network issues.
                    this.logger.error("Failed to subscribe: %s", err.message);
                } else {
                    // `count` represents the number of channels this server are currently subscribed to.
                    this.logger.info(
                        `Subscribed successfully! This server is currently subscribed to ${count} channels.`,
                        paths
                    );
                }
            });
        }

        if (patterns.length) {
            await this.subscriber.psubscribe(...patterns, (err, count) => {
                if (err) {
                    // Just like other commands, subscribe() can fail for some reasons,
                    // ex network issues.
                    this.logger.error("Failed to subscribe: %s", err.message);
                } else {
                    // `count` represents the number of channels this server are currently subscribed to.
                    this.logger.info(
                        `Subscribed successfully! This server is currently subscribed to ${count} pattern channels.\n`,
                        patterns
                    );
                }
            });
        }

        transport.handle(this.handler, merge(this.destroy$, fromEvent(this.subscriber, ev.ERROR)).pipe(first()))

        // router.matcher.eachPattern((topic, pattern) => {
        //     if (topic !== pattern) {
        //         this.logger.info('Transform pattern', pattern, 'to topic', topic)
        //     }
        // });
    }

    protected async onShutdown(): Promise<any> {
        await this._transport?.destroy();
        this.destroy$.next();
        this.destroy$.complete();

        this.publisher?.quit();
        this.publisher?.removeAllListeners();
        this.subscriber?.quit();
        this.subscriber?.removeAllListeners();

        this.publisher = this.subscriber = null;
        this.logger.info(`Redis microservice closed!`);
    }

    protected createRetryStrategy(options: RedisServConfig): (times: number) => undefined | number {
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

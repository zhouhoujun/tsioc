import { Execption, Inject, Injectable } from '@tsdi/ioc';
import { Packet, PatternFormatter, MESSAGE } from '@tsdi/common';
import { MircoServRouters, Outgoing, Server, TransportContext, TransportSession, Content, LOCALHOST, ev } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import Redis from 'ioredis';
import { Subscription, finalize } from 'rxjs';
import { RedisEndpoint } from './endpoint';
import { REDIS_SERV_OPTS, RedisServerOpts } from './options';
import { RedisIncoming } from './incoming';
import { RedisOutgoing } from './outgoing';
import { RedisContext } from './context';
import { RedisTransportSessionFactory, ReidsTransport } from '../transport';


/**
 * Redis Server.
 */
@Injectable()
export class RedisServer extends Server<TransportContext, Outgoing> {

    @InjectLog() logger!: Logger;

    private subscriber: Redis | null = null;
    private publisher: Redis | null = null;

    constructor(
        readonly endpoint: RedisEndpoint,
        @Inject(REDIS_SERV_OPTS) private options: RedisServerOpts
    ) {
        super();
    }

    protected async onStartup(): Promise<any> {
        const opts = this.options;
        const retryStrategy = opts.connectOpts?.retryStrategy ?? this.createRetryStrategy(opts);
        const options = this.options.connectOpts = {
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.connectOpts,
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
        if (!this.subscriber || !this.publisher) throw new Execption('Subscriber and Publisher cannot be null');

        const subscriber = this.subscriber;
        const publisher = this.publisher;

        const factory = this.endpoint.injector.get(RedisTransportSessionFactory);
        const session = factory.create({
            subscriber,
            publisher
        }, { ...this.options.transportOpts, serverSide: true });

        session.on(ev.MESSAGE, (channel: string, packet: Packet) => {
            this.requestHandler(session, packet)
        });

        const router = this.endpoint.injector.get(MircoServRouters).get('redis');
        if (this.options.content?.prefix && this.options.interceptors!.indexOf(Content) >= 0) {
            const content = this.endpoint.injector.get(PatternFormatter).format(`${this.options.content.prefix}/**`);
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


        router.matcher.eachPattern((topic, pattern) => {
            if (topic !== pattern) {
                this.logger.info('Transform pattern', pattern, 'to topic', topic)
            }
        });
    }

    protected async onShutdown(): Promise<any> {
        await this.subscriber?.quit();
        await this.publisher?.quit();
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

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession<ReidsTransport>, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new RedisIncoming(session, packet);
        const res = new RedisOutgoing(session, packet.id, packet.url!);

        const ctx = this.createContext(req, res);
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => {
                ctx.destroy();
            }))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        const opts = this.options;
        opts.timeout && req.socket.subscriber.stream.setTimeout && req.socket.subscriber.stream.setTimeout(opts.timeout, () => {
            req.emit?.(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: RedisIncoming, res: RedisOutgoing): RedisContext {
        const injector = this.endpoint.injector;
        return new RedisContext(injector, req, res, this.options);
    }

}

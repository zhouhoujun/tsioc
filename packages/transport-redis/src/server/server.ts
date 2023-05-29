import { MESSAGE, MicroService, Outgoing, Packet, Router, TransportContext, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { LOCALHOST, ev } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logs';
import Redis from 'ioredis';
import { Subscription, finalize } from 'rxjs';
import { RedisEndpoint } from './endpoint';
import { REDIS_SERV_OPTS, RedisServerOpts } from './options';
import { RedisIncoming } from './incoming';
import { RedisOutgoing } from './outgoing';
import { RedisContext } from './context';



@Injectable()
export class RedisServer extends MicroService<TransportContext, Outgoing> {

    @InjectLog() logger!: Logger;

    private redis: Redis | null = null;

    constructor(
        readonly endpoint: RedisEndpoint,
        @Inject(REDIS_SERV_OPTS) private options: RedisServerOpts
    ) {
        super();
    }

    protected async onStartup(): Promise<any> {
        const logger = this.logger;

        const opts = this.options;
        const retryStrategy = opts.connectOpts?.retryStrategy ?? this.createRetryStrategy(opts);
        this.redis = new Redis({
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.connectOpts
        });
        this.redis.on(ev.ERROR, (err) => logger.error(err));

        const factory = this.endpoint.injector.get(TransportSessionFactory);
        const session = factory.create(this.redis, opts.transportOpts);

        session.on(ev.MESSAGE, (channel: string, packet: Packet) => {
            this.requestHandler(session, packet)
        })

    }

    protected async onStart(): Promise<any> {
        const router = this.endpoint.injector.get(Router);
        await this.redis?.subscribe(...Array.from(router.subscribes.values()), (err, count) => {
            if (err) {
                // Just like other commands, subscribe() can fail for some reasons,
                // ex network issues.
                this.logger.error("Failed to subscribe: %s", err.message);
            } else {
                // `count` represents the number of channels this client are currently subscribed to.
                this.logger.info(
                    `Subscribed successfully! This client is currently subscribed to ${count} channels.`
                );
            }
        })
    }

    protected async onShutdown(): Promise<any> {
        this.redis?.quit();
        this.redis = null;
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
    protected requestHandler(session: TransportSession<Redis>, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new RedisIncoming(session, packet);
        const res = new RedisOutgoing(session, packet.url!, packet.id);

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
        opts.timeout && req.socket.stream.setTimeout && req.socket.stream.setTimeout(opts.timeout, () => {
            req.emit?.(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: RedisIncoming, res: RedisOutgoing): RedisContext {
        const injector = this.endpoint.injector;
        return new RedisContext(injector, req, res);
    }

}

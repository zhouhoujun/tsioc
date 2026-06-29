import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, Events, LOCALHOST, RequestInitOpts, TopicRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import Redis from 'ioredis';
import { REDIS_CLIENT_OPTIONS, RedisClientOptions } from './options';
import { RedisRequest } from './request';

@Injectable()
export class RedisClient extends AbstractClient<RedisRequest<any>, ResponseEvent<any>, TopicRequestOptions> {

    @InjectLog()
    private logger!: Logger;

    private connection?: Redis;

    constructor(
        readonly handler: ClientHandler<RedisRequest<any>, ResponseEvent<any>>,
        @Inject(REDIS_CLIENT_OPTIONS, { nullable: true }) private options: RedisClientOptions
    ) {
        super();
        if (!options.url && !options.connectOpts) {
            options.connectOpts = { host: LOCALHOST, port: 6379 } as any;
        }
    }

    protected connect(): Observable<Redis> {
        return defer(async () => {
            const valid = this.connection && this.isValid(this.connection);
            if (valid) return this.connection!;

            if (this.connection) {
                this.connection.removeAllListeners();
                this.connection.disconnect();
            }

            return await new Promise<Redis>((resolve, reject) => {
                const redis = this.createConnection(this.options);

                const cleanup = () => {
                    redis.off(Events.CONNECT, onConnect)
                        .off(Events.ERROR, onError);
                };

                const onError = (err: Error) => {
                    cleanup();
                    this.logger?.error('Redis connection error:', err);
                    reject(err);
                };

                const onConnect = () => {
                    cleanup();
                    this.connection = redis;
                    resolve(redis);
                };

                redis.on(Events.ERROR, onError)
                    .on(Events.CONNECT, onConnect);
            });
        });
    }

    protected initContext(context: Context, req: RedisRequest<any>): void {
        context.set(RedisClient, this);
        context.set(RedisRequest, req);
        context.set(SOCKET, this.connection as any);
    }

    protected buildRequest(first: RedisRequest<any> | Pattern, options: RequestInitOpts<any, TopicRequestOptions>): RedisRequest<any> {
        if (first instanceof RedisRequest) {
            return first;
        }
        const formatter = this.handler.injector.get(PatternFormatter);
        if (isString(first)) {
            return new RedisRequest(formatter.format(first), first, options);
        }
        return new RedisRequest(formatter.format(first), first, options);
    }

    protected override request(first: Pattern | RedisRequest<any>, options: TopicRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(
            switchMap(() => super.request(first, options))
        );
    }

    protected async onShutdown(): Promise<void> {
        if (!this.connection) return;

        return new Promise<void>((resolve) => {
            let settled = false;
            const cleanup = () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                this.connection?.removeAllListeners();
                this.connection = undefined!;
                resolve();
            };

            this.connection!.once(Events.CLOSE, cleanup);

            const timeout = setTimeout(() => {
                this.logger?.warn('Redis client shutdown timeout, forcing disconnect');
                try {
                    this.connection?.disconnect();
                } finally {
                    cleanup();
                }
            }, 5000);
            if (typeof (timeout as any).unref === 'function') {
                (timeout as any).unref();
            }

            this.connection!.once(Events.CLOSE, () => {
                clearTimeout(timeout);
            });

            this.connection!.quit();
        }).catch(err => {
            this.logger?.error('Redis client shutdown error:', err);
            if (this.connection) {
                this.connection.removeAllListeners();
                this.connection.disconnect();
                this.connection = undefined!;
            }
        });
    }

    protected isValid(connection: Redis): boolean {
        return connection.status === 'ready' || connection.status === 'connect';
    }

    protected createConnection(opts: RedisClientOptions): Redis {
        return opts.url ? new Redis(opts.url, (opts.connectOpts || {}) as any) : new Redis((opts.connectOpts || {}) as any);
    }
}

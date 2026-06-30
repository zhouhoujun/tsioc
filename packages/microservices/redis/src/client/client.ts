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
                this.disposeConnection(this.connection);
            }

            return await new Promise<Redis>((resolve, reject) => {
                const redis = this.createConnection(this.options);

                const cleanup = () => {
                    redis.off(Events.CONNECT, onConnect)
                        .off(Events.ERROR, onError)
                        .off(Events.CLOSE, onClose);
                };

                const onError = (err: Error) => {
                    cleanup();
                    this.logger?.error('Redis connection error:', err);
                    this.disposeConnection(redis);
                    reject(err);
                };

                const onConnect = () => {
                    cleanup();
                    this.connection = redis;
                    resolve(redis);
                };

                const onClose = () => {
                    cleanup();
                    this.disposeConnection(redis);
                    reject(new Error('Connection closed before connect'));
                };

                redis.on(Events.ERROR, onError)
                    .on(Events.CONNECT, onConnect)
                    .once(Events.CLOSE, onClose);
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
        if (isString(first)) {
            const formatter = this.handler.injector.get(PatternFormatter, null);
            return new RedisRequest(formatter ? formatter.format(first) : first, null, options);
        }
        const formatter = this.handler.injector.get(PatternFormatter, null);
        const topic = formatter ? formatter.format(first) : (typeof (first as any)?.cmd === 'string' ? `cmd:${(first as any).cmd}` : JSON.stringify(first));
        return new RedisRequest(topic, first, options);
    }

    protected async onShutdown(): Promise<void> {
        if (!this.connection) return;

        const connection = this.connection;
        this.connection = undefined;

        return new Promise<void>((resolve) => {
            let settled = false;
            let timeout: NodeJS.Timeout | undefined;
            const cleanup = () => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = undefined;
                }
                connection.removeAllListeners();
                resolve();
            };

            connection.once(Events.CLOSE, cleanup);

            connection.once(Events.CLOSE, () => {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = undefined;
                }
            });

            Promise.resolve(connection.quit()).catch(() => {
                connection.disconnect();
                cleanup();
            });
            timeout = setTimeout(() => {
                this.logger?.warn('Redis client shutdown timeout, forcing disconnect');
                try {
                    connection.disconnect();
                } finally {
                    cleanup();
                }
            }, 5000);
            if (typeof (timeout as any).unref === 'function') {
                (timeout as any).unref();
            }
        }).catch(err => {
            this.logger?.error('Redis client shutdown error:', err);
            this.disposeConnection(connection);
        });
    }

    protected isValid(connection: Redis): boolean {
        return connection.status === 'ready' || connection.status === 'connect';
    }

    protected createConnection(opts: RedisClientOptions): Redis {
        return opts.url ? new Redis(opts.url, (opts.connectOpts || {}) as any) : new Redis((opts.connectOpts || {}) as any);
    }

    private disposeConnection(connection?: Redis | null): void {
        if (!connection) {
            return;
        }
        connection.removeAllListeners();
        try {
            connection.disconnect();
        } catch {
            // ignore disconnect errors during shutdown/failed connect
        }
    }
}

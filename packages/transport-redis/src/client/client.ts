import { Inject, Injectable } from '@tsdi/ioc';
import { Client, ClientSubscribeCallback, PacketCallback, Publisher, Subscriber, TransportEvent, TransportRequest } from '@tsdi/core';
import Redis, { RedisOptions } from 'ioredis';
import { RedisHandler } from './handler';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';



@Injectable({ static: false })
export class RedisClient extends Client<TransportRequest, TransportEvent>
    implements Subscriber, Publisher {

    private redis: Redis | null = null;
    constructor(
        readonly handler: RedisHandler,
        @Inject(REDIS_CLIENT_OPTS) private options: RedisClientOpts) {
        super();
    }
    publish(topic: string, message: string | Buffer, opts: any, callback?: PacketCallback<any> | undefined): this;
    publish(topic: string, message: string | Buffer, callback?: PacketCallback<any> | undefined): this;
    publish(topic: unknown, message: unknown, opts?: unknown, callback?: unknown): this {
        throw new Error('Method not implemented.');
    }
    subscribe(topic: string | string[], opts: any, callback?: ClientSubscribeCallback<any> | undefined): this;
    subscribe(topic: string | string[] | Record<string, any>, callback?: ClientSubscribeCallback<any> | undefined): this;
    subscribe(topic: unknown, opts?: unknown, callback?: unknown): this {
        throw new Error('Method not implemented.');
    }
    unsubscribe(topic: string | string[], opts?: Object | undefined, callback?: PacketCallback<any> | undefined): this {
        throw new Error('Method not implemented.');
    }

    protected async connect(): Promise<void> {
        if (this.redis) return;

        const opts = this.options;
        this.redis = new Redis(opts.connectOpts);
    }

    protected async onShutdown(): Promise<void> {
        await this.redis?.quit();
    }
}

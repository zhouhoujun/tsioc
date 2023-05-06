import { Inject, Injectable } from '@tsdi/ioc';
import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import Redis, { RedisOptions } from 'ioredis';
import { RedisHandler } from './handler';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';



@Injectable({ static: false })
export class RedisClient extends Client<TransportRequest, TransportEvent> {

    private pubClient: Redis | null = null;
    private subClient: Redis | null = null;
    constructor(
        readonly handler: RedisHandler,
        @Inject(REDIS_CLIENT_OPTS) private options: RedisClientOpts) {
        super();
    }

    protected async connect(): Promise<void> {
        if (this.pubClient && this.subClient) return;

        const opts = this.options;
        this.subClient = new Redis(opts.connectOpts);
        this.pubClient = new Redis(opts.connectOpts);

    }

    protected async onShutdown(): Promise<void> {
        await this.subClient?.quit();
        await this.pubClient?.quit();
    }

    // protected createDuplex(opts: RedisClientOpts): Duplex {
    //     return createClient(opts.connectOpts!);
    // }

    // protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
    //     const packet = this.context.get(PacketFactory);
    //     return new Connection(duplex, packet, opts);
    // }

}

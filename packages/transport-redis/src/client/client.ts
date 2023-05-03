import { Inject, Injectable } from '@tsdi/ioc';
import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';
import { RedisHandler } from './handler';



@Injectable()
export class RedisClient extends Client<TransportRequest, TransportEvent> {

    private pubClient: Redis | null = null;
    private subClient: Redis | null = null;
    constructor(
        readonly handler: RedisHandler,
        @Inject(REDIS_CLIENT_OPTS, { nullable: true }) private options: RedisClientOpts) {
        super();
    }

    // protected buildRequest(context: ClientEndpointContext, url: Pattern | TransportRequest, options?: RequestOptions): TransportRequest {
    //     return url instanceof TransportRequest ? url : new TransportRequest(url, { context, ...options });
    // }

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

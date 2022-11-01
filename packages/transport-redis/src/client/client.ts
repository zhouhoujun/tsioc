import { Abstract, Injectable, Nullable } from '@tsdi/ioc';
import { Client, ClientEndpointContext, OnDispose, Pattern, RequestOptions, TransportRequest } from '@tsdi/core';
import Redis, { RedisOptions } from 'ioredis';
import { TransportClientOpts } from '@tsdi/transport';


@Abstract()
export abstract class RedisClientOpts extends TransportClientOpts {
    /**
     * connect options.
     */
    abstract connectOpts: RedisOptions;
}



@Injectable()
export class RedisClient extends Client<Pattern, RequestOptions, RedisClientOpts> implements OnDispose {

    private pubClient: Redis | null = null;
    private subClient: Redis | null = null;
    constructor(@Nullable() options: RedisClientOpts) {
        super(options);
    }

    protected buildRequest(context: ClientEndpointContext, url: Pattern | TransportRequest, options?: RequestOptions): TransportRequest {
        return url instanceof TransportRequest ? url : new TransportRequest(url, { context, ...options });
    }

    protected async connect(): Promise<void> {
        if (this.pubClient && this.subClient) return;

        const opts = this.getOptions();
        this.subClient = new Redis(opts.connectOpts);
        this.pubClient = new Redis(opts.connectOpts);

    }

    async close(): Promise<void> {
        this.subClient?.quit();
        this.pubClient?.quit();
        this.subClient = this.pubClient = null;
    }

    async onDispose(): Promise<void> {
        await this.close();
        await this.context.destroy();
    }


    // protected createDuplex(opts: RedisClientOpts): Duplex {
    //     return createClient(opts.connectOpts!);
    // }

    // protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
    //     const packet = this.context.get(PacketFactory);
    //     return new Connection(duplex, packet, opts);
    // }

}

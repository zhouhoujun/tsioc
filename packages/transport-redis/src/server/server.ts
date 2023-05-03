import { MicroService, Outgoing, TransportContext, TransportEndpointOptions } from '@tsdi/core';
import { Abstract, ArgumentExecption, Inject, Injectable, Token } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import Redis, { RedisOptions } from 'ioredis';
import { RedisEndpoint } from './endpoint';
import { REDIS_SERV_OPTS } from './options';
import { ev } from '@tsdi/transport';


export interface RedisOpts extends TransportEndpointOptions<TransportContext> {
    connectOpts: RedisOptions;
}

@Injectable()
export class RedisServer extends MicroService<TransportContext, Outgoing> {

    @InjectLog() logger!: Logger;
    
    constructor(
        readonly endpoint: RedisEndpoint,
        @Inject(REDIS_SERV_OPTS, { nullable: true }) private options: RedisOpts
    ) {
        super();
    }

    private pubClient: Redis | null = null;
    private subClient: Redis | null = null;

    protected createServer(opts: RedisOpts) {
        this.pubClient = new Redis(opts.connectOpts);
        this.subClient = new Redis(opts.connectOpts);
    }
    protected async onStartup(): Promise<any> {
        const logger = this.logger;
        if (!this.pubClient || !this.subClient) throw new ArgumentExecption('redis client not created');
        this.pubClient.on(ev.ERROR, (err) => logger.error(err));
        this.subClient.on(ev.ERROR, (err) => logger.error(err));
    }
    protected async onStart(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected async onShutdown(): Promise<any> {
        this.subClient?.quit();
        this.pubClient?.quit();
        this.subClient = this.pubClient = null;
    }

    // protected async listen(server: RedisClient, opts: ListenOpts): Promise<void> {

    // }
    // protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
    //     throw new Error('Method not implemented.');
    // }
    // protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
    //     throw new Error('Method not implemented.');
    // }

}

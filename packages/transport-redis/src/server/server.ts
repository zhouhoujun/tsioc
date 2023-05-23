import { MicroService, Outgoing, TransportContext } from '@tsdi/core';
import { ArgumentExecption, Inject, Injectable } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import Redis from 'ioredis';
import { RedisEndpoint } from './endpoint';
import { ev } from '@tsdi/transport';
import { REDIS_SERV_OPTS, RedisOpts } from './options';



@Injectable()
export class RedisServer extends MicroService<TransportContext, Outgoing> {

    @InjectLog() logger!: Logger;

    private redis: Redis | null = null;

    constructor(
        readonly endpoint: RedisEndpoint,
        @Inject(REDIS_SERV_OPTS) private options: RedisOpts
    ) {
        super();
    }

    protected createServer(opts: RedisOpts) {
        this.redis = new Redis(opts.connectOpts);
    }

    protected async onStartup(): Promise<any> {
        const logger = this.logger;
        if (!this.redis) throw new ArgumentExecption('redis client not created');
        this.redis.on(ev.ERROR, (err) => logger.error(err));
    }

    protected async onStart(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    protected async onShutdown(): Promise<any> {
        this.redis?.quit();
        this.redis = null;
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

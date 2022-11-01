import { ListenOpts, Server } from '@tsdi/core';
import { Abstract, ArgumentExecption, Injectable, Token } from '@tsdi/ioc';
import { Connection, ConnectionOpts, ev, IncomingMessage, OutgoingMessage, TransportContext, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { Duplex } from 'stream';
import { RedisClient, createClient, ClientOpts } from 'ioredis';
import { Subscription } from 'rxjs';


@Abstract()
export abstract class RedisOpts extends TransportServerOpts<IncomingMessage, OutgoingMessage> {
    abstract connectOpts?: ClientOpts;
}

@Injectable()
export class RedisServer extends Server<IncomingMessage, OutgoingMessage, TransportContext, RedisOpts> {

    private pubClient: RedisClient | null = null;
    private subClient: RedisClient | null = null;

    protected createServer(opts: RedisOpts) {
        this.pubClient = createClient(opts.connectOpts);
        this.subClient = createClient(opts.connectOpts);
    }

    async start(): Promise<void> {
        const logger = this.logger;
        if (!this.pubClient || !this.subClient) throw new ArgumentExecption('redis client not created');
        this.pubClient.on(ev.ERROR, (err) => logger.error(err));
        this.subClient.on(ev.ERROR, (err) => logger.error(err));
        // this.subClient.on(ev.MESSAGE, ()=> this.pubClient?.emit())

    }

    async close(): Promise<void> {
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

import { ListenOpts } from '@tsdi/core';
import { Injectable, Token } from '@tsdi/ioc';
import { Connection, ConnectionOpts, IncomingMessage, OutgoingMessage, TransportContext, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { Duplex } from 'stream';
import { RedisClient, createClient, ClientOpts } from 'redis';
import { Subscription } from 'rxjs';


@Injectable()
export class RedisServer extends TransportServer<IncomingMessage, OutgoingMessage, RedisClient> {

    protected createServer(opts: TransportServerOpts<IncomingMessage, OutgoingMessage>) {
        return createClient(opts as ClientOpts); 
    }
    protected async listen(server: RedisClient, opts: ListenOpts): Promise<void> {
    
    }
    protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
        throw new Error('Method not implemented.');
    }
    protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
        throw new Error('Method not implemented.');
    }


}

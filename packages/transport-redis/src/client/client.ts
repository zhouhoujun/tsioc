import { Injectable, InvocationContext, Nullable, Token } from '@tsdi/ioc';
import { Connection, ConnectionOpts, ev, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Duplex } from 'form-data';
import { createClient, RedisClientType } from 'redis';
import { Observable } from 'rxjs';
import { RedisClientOpts } from './options';


@Injectable()
export class RedisClient extends TransportClient {
    
    constructor(@Nullable() options: RedisClientOpts) {
        super(options);
    }

    protected createDuplex(opts: TransportClientOpts): Duplex {
        return createClient(opts);
    }
    protected onConnect(duplex: Duplex, opts?: ConnectionOpts | undefined): Observable<Connection> {
        throw new Error('Method not implemented.');
    }
}

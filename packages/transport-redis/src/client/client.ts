import { Injectable, Nullable } from '@tsdi/ioc';
import { Connection, ConnectionOpts, ev, PacketFactory, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Duplex } from 'stream';
import { createClient, ClientOpts } from 'redis';
import { Observable } from 'rxjs';
import { RedisClientOpts } from './options';


@Injectable()
export class RedisClient extends TransportClient {

    constructor(@Nullable() options: RedisClientOpts) {
        super(options);
    }

    protected createDuplex(opts: TransportClientOpts): Duplex {
        return createClient(opts as ClientOpts);
    }

    protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(PacketFactory);
        return new Connection(duplex, packet, opts);
    }

}

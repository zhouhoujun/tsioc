import { Abstract, Injectable, Nullable } from '@tsdi/ioc';
import { TransportServer, TransportServerOpts } from '@tsdi/transport';
import { ServerOptions as WsOptions } from 'ws';



@Abstract()
export abstract class WsServerOpts extends TransportServerOpts {
    abstract options: WsOptions
}


@Injectable()
export class WsServer extends TransportServer {

    constructor(@Nullable() options: WsServerOpts) {
        super(options);
    }

}
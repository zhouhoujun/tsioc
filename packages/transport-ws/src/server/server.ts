import { ListenOpts } from '@tsdi/core';
import { Abstract, Injectable, lang, Nullable } from '@tsdi/ioc';
import { ev, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { Duplex } from 'form-data';
import *  as ws from 'ws';



@Abstract()
export abstract class WsServerOpts extends TransportServerOpts {
    abstract serverOpts: ws.ServerOptions;
}


@Injectable()
export class WsServer extends TransportServer<ws.Server, WsServerOpts> {

    constructor(@Nullable() options: WsServerOpts) {
        super(options);
    }

    protected buildServer(opts: WsServerOpts): ws.Server<ws.WebSocket> {
        return new ws.Server(opts.serverOpts);
    }

    protected override parseToDuplex(conn: ws.WebSocket, ...args: any[]): Duplex {
        return ws.createWebSocketStream(conn, { objectMode: true });
    }

    protected listen(server: ws.Server<ws.WebSocket>, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        const sropts = this.getOptions().serverOpts as ws.ServerOptions;
        if (sropts.server) {
            if (!sropts.server.listening) {
                sropts.server.listen(opts, defer.resolve);
            } else {
                defer.resolve();
            }
        } else {
            // server
            defer.resolve();
        }
        return defer.promise;
    }

}
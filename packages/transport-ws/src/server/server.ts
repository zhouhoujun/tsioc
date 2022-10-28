import { ListenOpts, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, lang, Nullable } from '@tsdi/ioc';
import { Connection, ConnectionOpts, ev, IncomingMessage, IncomingUtil, OutgoingMessage, PacketFactory, TransportContext, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { Duplex } from 'stream';
import *  as ws from 'ws';



@Abstract()
export abstract class WsServerOpts extends TransportServerOpts<IncomingMessage, OutgoingMessage> {
    abstract serverOpts: ws.ServerOptions;
}


@Injectable()
export class WsServer extends TransportServer<IncomingMessage, OutgoingMessage, ws.Server, WsServerOpts> {
    constructor(@Nullable() options: WsServerOpts) {
        super(options);
    }

    protected createServer(opts: WsServerOpts): ws.Server<ws.WebSocket> {
        return new ws.Server(opts.serverOpts);
    }
    protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(PacketFactory);
        return new Connection(duplex, packet, opts);
    }
    protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
        const injector = this.context.injector;
        return new TransportContext(injector, req, res, this, injector.get(IncomingUtil))
    }

    protected override createDuplex(socket: ws.WebSocket): Duplex {
        return ws.createWebSocketStream(socket, { objectMode: true });
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
import { ListenOpts, MicroService, TransportContext, TransportEndpointOptions, Packet, ConfigableEndpoint } from '@tsdi/core';
import { Abstract, Inject, Injectable, lang, Nullable } from '@tsdi/ioc';
import { Duplex } from 'stream';
import *  as ws from 'ws';
import { WS_SERV_OPTS, WsServerOpts } from './options';
import { WsEndpoint } from './endpoint';


@Injectable()
export class WsServer extends MicroService<TransportContext> {

    private _server?: ws.Server;

    constructor(
        readonly endpoint: WsEndpoint,
        @Inject(WS_SERV_OPTS, {nullable: true}) private options: WsServerOpts) {
        super();
    }

    
    protected async onStartup(): Promise<any> {
        this._server = new ws.Server(this.options.serverOpts);
    }

    protected async onStart(): Promise<any> {
        
    }

    protected async onShutdown(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    // protected createServer(opts: WsServerOpts): ws.Server<ws.WebSocket> {
    //     return new ws.Server(opts.serverOpts);
    // }
    // protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
    //     const packet = this.context.get(PacketFactory);
    //     return new Connection(duplex, packet, opts);
    // }
    // protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
    //     const injector = this.context.injector;
    //     return new TransportContext(injector, req, res, this, injector.get(IncomingUtil))
    // }

    // protected override createDuplex(socket: ws.WebSocket): Duplex {
    //     return ws.createWebSocketStream(socket, { objectMode: true });
    // }

    protected listen(server: ws.Server<ws.WebSocket>, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        const sropts = this.options.serverOpts as ws.ServerOptions;
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
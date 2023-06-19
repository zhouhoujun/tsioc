import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import * as ws from 'ws';
import { WsHandler } from './handler';
import { WsClientOpts } from './options';



@Injectable()
export class WsClient extends Client<TransportRequest, TransportEvent> {

    private socket?: ws.WebSocket;
    constructor(
        readonly handler: WsHandler,
        @Inject() private options: WsClientOpts) {
        super();
    }

    protected connect(): Promise<any> | Observable<any> {
        throw new Error('Method not implemented.');
    }
    protected onShutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }


    // protected override createDuplex(opts: WSClitentOptions): Duplex {
    //     const socket = this.socket = new ws.WebSocket(opts.url, opts.connectOpts!)
    //     const stream = ws.createWebSocketStream(socket, { objectMode: true });
    //     return stream

    // }
    // protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
    //     const packet = this.context.get(PacketFactory);
    //     return new Connection(duplex, packet, opts);
    // }
}

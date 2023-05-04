import { Client, ConfigableEndpointOptions,  TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import * as ws from 'ws';
import { WsHandler } from './handler';


export interface WSClitentOptions extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url: string;
    connectOpts?: ws.ClientOptions;
}

const defs = {
    url: 'wss://127.0.0.1/'
} as WSClitentOptions;


@Injectable()
export class WsClient extends Client<TransportRequest, TransportEvent> {

    private socket?: ws.WebSocket;
    constructor(
        readonly handler: WsHandler,
        @Inject() private options: WSClitentOptions) {
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

import { RequestOptions } from '@tsdi/core';
import { Abstract, Injectable, Nullable, Token, tokenId } from '@tsdi/ioc';
import { Connection, ConnectionOpts, PacketFactory, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Duplex } from 'stream';
import * as ws from 'ws';

@Abstract()
export abstract class WSClitentOptions extends TransportClientOpts {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    abstract url: string;
    abstract connectOpts?: ws.ClientOptions;
}

const defs = {
    url: 'wss://127.0.0.1/'
} as WSClitentOptions;


@Injectable()
export class WsClient extends TransportClient<RequestOptions, WSClitentOptions> {

    private socket?: ws.WebSocket;
    constructor(@Nullable() options: WSClitentOptions) {
        super(options);
    }

    protected override getDefaultOptions(): WSClitentOptions {
        return defs 
    }

    protected override createDuplex(opts: WSClitentOptions): Duplex {
        const socket = this.socket = new ws.WebSocket(opts.url, opts.connectOpts!)
        const stream = ws.createWebSocketStream(socket, { objectMode: true });
        return stream

    }
    protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(PacketFactory);
        return new Connection(duplex, packet, opts);
    }
}

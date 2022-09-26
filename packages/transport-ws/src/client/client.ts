import { RequestOptions } from '@tsdi/core';
import { Abstract, Injectable, Nullable, Token, tokenId } from '@tsdi/ioc';
import { ClientConnection, RequestStrategy, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Duplex } from 'form-data';
import * as ws from 'ws';
import { WsTransportStrategy } from '../transport';


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
    transport: WsTransportStrategy
} as WSClitentOptions;


@Injectable()
export class WsClient extends TransportClient<RequestOptions, WSClitentOptions> {

    private socket?: ws.WebSocket;
    constructor(@Nullable() options: WSClitentOptions) {
        super(options);
    }

    protected override getDefaultOptions(): TransportClientOpts {
        return defs
    }

    protected override createDuplex(opts: WSClitentOptions): Duplex {
        const socket = this.socket = new ws.WebSocket(opts.url, opts.connectOpts!)
        const stream = ws.createWebSocketStream(socket, { objectMode: true });
        return stream

    }
}

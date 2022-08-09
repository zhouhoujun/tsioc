import { Abstract, Injectable, Nullable, Token, tokenId } from '@tsdi/ioc';
import { TransportClient, TransportClientOpts } from '@tsdi/transport';
import { ClientOptions as WsOptions } from 'ws';


@Abstract()
export abstract class WSClitentOptions extends TransportClientOpts {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    abstract url: string;
    abstract options?: WsOptions;
}


@Injectable()
export class WsClient extends TransportClient {

    constructor(@Nullable() options: WSClitentOptions) {
        super(options);
    }

}
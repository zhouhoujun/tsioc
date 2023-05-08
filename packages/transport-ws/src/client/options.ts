import { Client, ConfigableEndpointOptions, TransportRequest } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import * as ws from 'ws';

export interface WsClientOpts extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url: string;
    connectOpts?: ws.ClientOptions;
}

export interface WsClientsOpts extends WsClientOpts {
    client: Token<Client>;
}

export const WS_CLIENT_OPTS = tokenId<WsClientOpts>('WS_CLIENT_OPTS');

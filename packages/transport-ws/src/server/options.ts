import { ListenOpts, MicroService, TransportContext, TransportEndpointOptions, Packet, ConfigableEndpoint } from '@tsdi/core';
import { Abstract, Injectable, lang, Nullable, tokenId } from '@tsdi/ioc';
import { Duplex } from 'stream';
import *  as ws from 'ws';




export interface WsServerOpts extends TransportEndpointOptions<TransportContext> {
    serverOpts: ws.ServerOptions;
}

export const WS_SERV_OPTS = tokenId<WsServerOpts>('WS_SERV_OPTS');

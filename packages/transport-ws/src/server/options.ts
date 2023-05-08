import { Filter, Interceptor, ListenOpts, TransportContext, TransportEndpointOptions } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import *  as ws from 'ws';




export interface WsServerOpts extends TransportEndpointOptions<TransportContext> {
    serverOpts: ws.ServerOptions;
    listenOpts?: ListenOpts;
    server?: any;
}

export const WS_SERV_OPTS = tokenId<WsServerOpts>('WS_SERV_OPTS');

export const WS_SERV_INTERCEPTORS = tokenId<Interceptor[]>('WS_SERV_INTERCEPTORS');

export const WS_SERV_FILTERS = tokenId<Filter[]>('WS_SERV_FILTERS');


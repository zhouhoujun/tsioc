import { CanActivate, Filter, Interceptor, ListenOpts, TransportContext, TransportEndpointOptions, TransportSessionOpts } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ContentOptions, MimeSource, SessionOptions } from '@tsdi/transport';
import *  as ws from 'ws';




export interface WsServerOpts extends TransportEndpointOptions<TransportContext> {
    /**
     * socket timeout.
     */
    timeout?: number;
    mimeDb?: Record<string, MimeSource>;
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    serverOpts?: ws.ServerOptions;
    /**
     * transport session options.
     */
    transportOpts?: TransportSessionOpts;
    listenOpts?: ListenOpts;
    server?: any;
    detailError?: boolean;
}

/**
 * Token of ws server opptions.
 */
export const WS_SERV_OPTS = tokenId<WsServerOpts>('WS_SERV_OPTS');
/**
 * Token of ws server interceptors.
 */
export const WS_SERV_INTERCEPTORS = tokenId<Interceptor[]>('WS_SERV_INTERCEPTORS');

/**
 * Token of ws filters.
 */
export const WS_SERV_FILTERS = tokenId<Filter[]>('WS_SERV_FILTERS');

/**
 * WS Guards.
 */
export const WS_SERV_GUARDS = tokenId<CanActivate[]>('WS_SERV_GUARDS');


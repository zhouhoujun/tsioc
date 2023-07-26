import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ContentOptions, MimeSource, SessionOptions, TransportContext, TransportEndpointOptions, TransportSessionOpts } from '@tsdi/transport';
import { SocketOptions, BindOptions } from 'dgram';




export interface UdpServerOpts extends TransportEndpointOptions<TransportContext> {
    /**
     * socket timeout.
     */
    timeout?: number;
    mimeDb?: Record<string, MimeSource>;
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    serverOpts?: SocketOptions;
    bindOpts?: BindOptions;
    /**
     * transport session options.
     */
    transportOpts?: TransportSessionOpts;
    server?: any;
    detailError?: boolean;
}

/**
 * Token of ws server opptions.
 */
export const UDP_SERV_OPTS = tokenId<UdpServerOpts>('UDP_SERV_OPTS');
/**
 * Token of ws server interceptors.
 */
export const UDP_SERV_INTERCEPTORS = tokenId<Interceptor[]>('UDP_SERV_INTERCEPTORS');

/**
 * Token of ws filters.
 */
export const UDP_SERV_FILTERS = tokenId<Filter[]>('UDP_SERV_FILTERS');

/**
 * UDP Guards.
 */
export const UDP_SERV_GUARDS = tokenId<CanActivate[]>('UDP_SERV_GUARDS');


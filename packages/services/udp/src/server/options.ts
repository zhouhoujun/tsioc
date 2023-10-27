import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { ServerOpts } from '@tsdi/endpoints';
import { tokenId } from '@tsdi/ioc';
import { SocketOptions, BindOptions } from 'dgram';




export interface UdpServerOpts extends ServerOpts<SocketOptions> {
    /**
     * socket timeout.
     */
    timeout?: number;
    bindOpts?: BindOptions;
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


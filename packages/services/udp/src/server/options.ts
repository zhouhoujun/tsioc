import { tokenId } from '@tsdi/ioc';
import { GuardLike, Filter, Interceptor } from '@tsdi/core';
import { ServerOpts } from '@tsdi/endpoints';
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
export const UDP_SERV_GUARDS = tokenId<GuardLike[]>('UDP_SERV_GUARDS');


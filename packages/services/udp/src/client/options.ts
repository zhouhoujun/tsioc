import { Filter, Interceptor } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ResponseEvent } from '@tsdi/common';
import { TransportOpts } from '@tsdi/common/transport';
import { ClientOpts } from '@tsdi/common/client';
import { SocketOptions } from 'dgram';
import { UdpRequest } from './request';


export interface UdpClientTransportOpts extends TransportOpts {
    host?: string;
}

export interface UdpClientOpts extends ClientOpts<SocketOptions> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url?: string;
    transportOpts?: UdpClientTransportOpts;
    timeout?: number;
}


/**
 * UDP client interceptors.
 */
export const UDP_CLIENT_INTERCEPTORS = tokenId<Interceptor<UdpRequest, ResponseEvent>[]>('UDP_CLIENT_INTERCEPTORS');
/**
 * UDP client filters.
 */
export const UDP_CLIENT_FILTERS = tokenId<Filter<UdpRequest, ResponseEvent>[]>('UDP_CLIENT_FILTERS');

import { Filter, Interceptor } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { TransportRequest, TransportEvent } from '@tsdi/common';
import { TransportOpts } from '@tsdi/common/transport';
import { ClientOpts } from '@tsdi/common/client';
import { SocketOptions } from 'dgram';


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
 * UDP client opptions.
 */
export const UDP_CLIENT_OPTS = tokenId<UdpClientOpts>('UDP_CLIENT_OPTS');
/**
 * UDP client interceptors.
 */
export const UDP_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('UDP_CLIENT_INTERCEPTORS');
/**
 * UDP client filters.
 */
export const UDP_CLIENT_FILTERS = tokenId<Filter<TransportRequest, TransportEvent>[]>('UDP_CLIENT_FILTERS');

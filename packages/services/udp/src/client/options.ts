import { Filter, ApplicationInterceptor } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ResponseEvent } from '@tsdi/common';
import { TransportOptions } from '@tsdi/transport';
import { ClientConfig } from '@tsdi/common/client';
import { SocketOptions } from 'node:dgram';
import { UdpRequest } from './request';


export interface UdpClientTransportOpts extends TransportOptions {
    host?: string;
}

export interface UdpClientConfig extends ClientConfig<SocketOptions> {
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
export const UDP_CLIENT_INTERCEPTORS = tokenId<ApplicationInterceptor<UdpRequest<any>, ResponseEvent<any>>[]>('UDP_CLIENT_INTERCEPTORS');
/**
 * UDP client filters.
 */
export const UDP_CLIENT_FILTERS = tokenId<Filter<UdpRequest<any>, ResponseEvent<any>>[]>('UDP_CLIENT_FILTERS');

import { token } from '@tsdi/ioc';
import { ResponseEvent } from '@tsdi/common';
import { ClientOptions } from '@tsdi/common/client';
import { ConnectionOptions } from 'node:tls';
import { SocketConstructorOpts, NetConnectOpts } from 'node:net';
import { TcpRequest } from './request';




/**
 * tcp client config.
 */
export interface TcpClientConfig extends ClientOptions<TcpRequest<any>, ResponseEvent<any>> {
    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * connectOptions
     */
    connectOpts?: NetConnectOpts | ConnectionOptions;
    /**
     * socket options.
     */
    socketOpts?: SocketConstructorOpts;
}

export const TCP_CLIENT_OPTIONS =  token<TcpClientConfig>('TCP_CLIENT_OPTIONS');

// /**
//  * tcp client interceptors.
//  */
// export const TCP_CLIENT_INTERCEPTORS = tokenId<ApplicationInterceptor<TcpRequest<any>, ResponseEvent<any>>[]>('TCP_CLIENT_INTERCEPTORS');
// /**
//  * tcp client filters.
//  */
// export const TCP_CLIENT_FILTERS = tokenId<Filter[]>('TCP_CLIENT_FILTERS');

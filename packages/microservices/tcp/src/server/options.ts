import { token } from '@tsdi/ioc';
import { ListenOpts } from '@tsdi/common';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { ServiceConfig } from '../../../service/src/options';

/**
 * TCP server options.
 */
export interface TcpServOptions extends ServiceConfig {
    /**
     * listen options.
     */
    listenOpts?: ListenOpts;
    /**
     * server options for net or tls.
     */
    serverOpts?: net.ServerOpts | tls.TlsOptions;
    /**
     * is secure server or not.
     */
    secure?: boolean;
    /**
     * heybird service.
     */
    heybird?: string;
    /**
     * as default service or not.
     */
    asDefault?: boolean;
}

export const TCP_SERV_OPTIONS = token<TcpServOptions>('TCP_SERV_OPTIONS');
export const TCP_BIND_INTERCEPTORS = token<any[]>('TCP_BIND_INTERCEPTORS');
export const TCP_BIND_FILTERS = token<any[]>('TCP_BIND_FILTERS');
export const TCP_BIND_GUARDS = token<any[]>('TCP_BIND_GUARDS');

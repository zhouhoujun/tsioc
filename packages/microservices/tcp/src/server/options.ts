import { token, Provider } from '@tsdi/ioc';
import { ListenOpts, Transport } from '@tsdi/common';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { ServiceOptions } from '@tsdi/service';

/**
 * TCP server options.
 */
export interface TcpServOptions extends ServiceOptions {
    /**
     * Transport type.
     * 传输类型
     */
    transport: Transport.TCP;
    /**
     * Additional providers.
     * 额外提供者
     */
    providers?: Provider[];
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
    heybird?: Transport;
}

export const TCP_SERV_OPTIONS = token<TcpServOptions>('TCP_SERV_OPTIONS');
export const TCP_BIND_INTERCEPTORS = token<any[]>('TCP_BIND_INTERCEPTORS');
export const TCP_BIND_FILTERS = token<any[]>('TCP_BIND_FILTERS');
export const TCP_BIND_GUARDS = token<any[]>('TCP_BIND_GUARDS');

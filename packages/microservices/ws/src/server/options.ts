import { token, Provider } from '@tsdi/ioc';
import { ListenOpts, Transport } from '@tsdi/common';
import * as http from 'node:http';
import * as https from 'node:https';
import { ServiceOptions } from '@tsdi/service';

/**
 * WebSocket server options.
 * WebSocket 服务器选项
 */
export interface WsServOptions extends ServiceOptions {
    /**
     * Transport type.
     * 传输类型
     */
    transport: Transport.WS;
    /**
     * Additional providers.
     * 额外提供者
     */
    providers?: Provider[];
    /**
     * listen options.
     * 监听选项
     */
    listenOpts?: ListenOpts;
    /**
     * server options for http or https.
     * HTTP/HTTPS 服务器选项
     */
    serverOpts?: http.ServerOptions | https.ServerOptions;
    /**
     * is secure server or not (wss://).
     * 是否为安全服务器
     */
    secure?: boolean;
    /**
     * heybird service.
     * 混合服务模式
     */
    heybird?: Transport;
    /**
     * WebSocket path.
     * WebSocket 路径
     */
    path?: string;
}

export const WS_SERV_OPTIONS = token<WsServOptions>('WS_SERV_OPTIONS');
export const WS_BIND_INTERCEPTORS = token<any[]>('WS_BIND_INTERCEPTORS');
export const WS_BIND_FILTERS = token<any[]>('WS_BIND_FILTERS');
export const WS_BIND_GUARDS = token<any[]>('WS_BIND_GUARDS');

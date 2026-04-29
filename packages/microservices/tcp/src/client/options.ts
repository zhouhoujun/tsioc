import { token } from '@tsdi/ioc';
import { ResponseEvent } from '@tsdi/common';
import { ClientOptions } from '@tsdi/common/client';
import { ConnectionOptions } from 'node:tls';
import { SocketConstructorOpts, NetConnectOpts } from 'node:net';
import { TcpRequest } from './request';

/**
 * TCP client config for microservices.
 * 微服务 TCP 客户端配置
 */
export interface TcpClientOptions extends ClientOptions<TcpRequest<any>, ResponseEvent<any>> {
    /**
     * keep alive
     * 保持连接
     */
    keepalive?: number;
    /**
     * connect options
     * 连接选项
     */
    connectOpts?: NetConnectOpts | ConnectionOptions;
    /**
     * socket options
     * Socket 选项
     */
    socketOpts?: SocketConstructorOpts;
}

export const TCP_CLIENT_OPTIONS = token<TcpClientOptions>('TCP_CLIENT_OPTIONS');

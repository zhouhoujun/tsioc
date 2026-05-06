import { token, Token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import { ConnectionOptions } from 'node:tls';
import { SocketConstructorOpts, NetConnectOpts } from 'node:net';

/**
 * TCP client config for microservices.
 * 微服务 TCP 客户端配置
 */
export interface TcpClientOptions extends ClientOptions {
    /**
     * Transport type.
     * 传输类型
     */
    transport: Transport.TCP;
    /**
     * Transfer side (client/server).
     * 传输端 (客户端/服务端)
     */
    side: TransferSide.client;
    /**
     * Whether this is a microservice client.
     * 是否为微服务客户端
     */
    microservice?: boolean;
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

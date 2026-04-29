import { token, Token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ResponseEvent } from '@tsdi/common';
import { ClientConfig } from '@tsdi/client';
import { ConnectionOptions } from 'node:tls';
import { SocketConstructorOpts, NetConnectOpts } from 'node:net';
import { TcpRequest } from './request';

/**
 * TCP client config for microservices.
 * 微服务 TCP 客户端配置
 */
export interface TcpClientOptions extends ClientConfig<TcpRequest<any>, ResponseEvent<any>> {
    /**
     * Transport type.
     * 传输类型
     */
    transport: Transport;
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
     * Whether this should be registered as the default TCP client.
     * 是否注册为默认 TCP 客户端
     */
    asDefault?: boolean;
    /**
     * Transfers token.
     * 传输令牌
     */
    transfersToken?: Token;
    /**
     * Interceptors token.
     * 拦截器令牌
     */
    interceptorsToken?: Token;
    /**
     * Guards token.
     * 守卫令牌
     */
    guardsToken?: Token;
    /**
     * Filters token.
     * 过滤器令牌
     */
    filtersToken?: Token;
    /**
     * Backend token.
     * 后端令牌
     */
    backendToken?: Token;
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

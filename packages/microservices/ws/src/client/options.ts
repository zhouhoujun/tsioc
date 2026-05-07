import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import { ClientOptions as WsClientOpts } from 'ws';

/**
 * WebSocket client config for microservices.
 * 微服务 WebSocket 客户端配置
 */
export interface WsClientOptions extends ClientOptions {
    /**
     * Transport type.
     * 传输类型
     */
    transport: Transport.WS;
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
     * keep alive interval in ms.
     * 保持连接间隔（毫秒）
     */
    keepalive?: number;
    /**
     * WebSocket URL or connect options.
     * WebSocket URL 或连接选项
     */
    url?: string;
    /**
     * WebSocket connection options.
     * WebSocket 连接选项
     */
    connectOpts?: WsClientOpts;
    /**
     * Reconnect on disconnect.
     * 断开时自动重连
     */
    reconnect?: boolean;
    /**
     * Maximum reconnect attempts.
     * 最大重连次数
     */
    maxReconnectAttempts?: number;
}

export const WS_CLIENT_OPTIONS = token<WsClientOptions>('WS_CLIENT_OPTIONS');

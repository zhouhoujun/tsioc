import { Abstract } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, RequestContext, ResponseEvent } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ClientConfig } from '../options';

/**
 * Client transport strategy interface.
 * Defines protocol-specific connection, request creation, and lifecycle operations.
 * 客户端传输策略接口，定义协议特定的连接、请求创建和生命周期操作
 */
@Abstract()
export abstract class IClientTransportStrategy<
    TRequest = any,
    TResponse extends ResponseEvent<any> = ResponseEvent<any>,
    TConfig extends ClientConfig = ClientConfig
> {

    /**
     * Connect to the transport.
     * 连接到传输层
     */
    abstract connect(): Promise<void> | Observable<void>;

    /**
     * Create a request from pattern and options.
     * 根据模式和选项创建请求
     * @param pattern - URL or topic pattern
     * @param options - Request initialization options
     */
    abstract createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): TRequest;

    /**
     * Initialize request context with transport-specific data.
     * 初始化请求上下文
     * @param context - RequestContext instance
     * @param request - The request object
     */
    abstract initContext(context: RequestContext, request: TRequest): void;

    /**
     * Handle shutdown/cleanup.
     * 处理关闭/清理
     */
    abstract onShutdown(): Promise<void>;

    /**
     * Get the transport configuration.
     * 获取传输配置
     */
    abstract getConfig(): TConfig;

    /**
     * Check if transport is connected.
     * 检查传输层是否已连接
     */
    abstract isConnected(): boolean;
}

/**
 * Client transport strategy token.
 * 客户端传输策略令牌
 */
export const CLIENT_TRANSPORT_STRATEGY = 'CLIENT_TRANSPORT_STRATEGY';
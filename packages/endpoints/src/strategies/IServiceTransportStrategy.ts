import { Abstract, Injector } from '@tsdi/ioc';
import { RequestContext, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { ServiceConfig } from '../server.options';
import { ServiceHandler } from '../ServiceHandler';

/**
 * Server transport type (opaque handle for protocol-specific transport).
 * 服务端传输类型（协议特定传输的不透明句柄）
 */
export type ServerTransportHandle = any;

/**
 * Service transport strategy interface.
 * Defines protocol-specific server transport creation and handler binding.
 * 服务端传输策略接口，定义协议特定的服务端传输创建和处理器绑定
 */
@Abstract()
export abstract class IServiceTransportStrategy<
    TContext extends RequestContext = RequestContext,
    TConfig extends ServiceConfig = ServiceConfig
> {

    /**
     * Create transport for the server.
     * 为服务端创建传输层
     * @param injector - DI injector
     * @param server - The underlying server (http.Server, net.Server, etc.)
     * @param config - Service configuration
     */
    abstract createTransport(
        injector: Injector, 
        server: any, 
        config: TConfig
    ): ServerTransportHandle;

    /**
     * Bind handler to the transport.
     * 将处理器绑定到传输层
     * @param handler - Service handler
     * @param transport - Server transport handle
     */
    abstract bindHandler(
        handler: ServiceHandler<TContext, TConfig>, 
        transport: ServerTransportHandle
    ): void;

    /**
     * Get supported transport protocol.
     * 获取支持的传输协议
     */
    abstract getProtocol(): string;

    /**
     * Create request context for incoming request.
     * 为传入请求创建请求上下文
     * @param request - Incoming request
     * @param response - Outgoing response
     * @param config - Service configuration
     */
    abstract createContext(
        request: ReadableLike<Incoming>,
        response: WritableLike<Outgoing>,
        config: TConfig
    ): TContext;
}

/**
 * Service transport strategy token.
 * 服务端传输策略令牌
 */
export const SERVICE_TRANSPORT_STRATEGY = 'SERVICE_TRANSPORT_STRATEGY';
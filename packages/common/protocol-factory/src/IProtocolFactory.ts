import { Abstract } from '@tsdi/ioc';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver, AbstractRequestContext } from '@tsdi/endpoints';
import { Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';

/**
 * Protocol factory interface.
 * Creates protocol-specific strategies and context implementations.
 * 协议工厂接口，创建协议特定的策略和上下文实现
 */
@Abstract()
export abstract class IProtocolFactory<
    TClientStrategy extends IClientTransportStrategy = IClientTransportStrategy,
    TServerStrategy extends IServiceTransportStrategy = IServiceTransportStrategy,
    TContext extends AbstractRequestContext = AbstractRequestContext
> {

    /**
     * Get protocol name.
     * 获取协议名称
     */
    abstract getProtocol(): string;

    /**
     * Create client transport strategy.
     * 创建客户端传输策略
     */
    abstract createClientStrategy(): TClientStrategy;

    /**
     * Create server transport strategy.
     * 创建服务端传输策略
     */
    abstract createServerStrategy(): TServerStrategy;

    /**
     * Create request context.
     * 创建请求上下文
     * @param request - Incoming request
     * @param response - Outgoing response
     * @param config - Configuration
     */
    abstract createRequestContext(
        request: ReadableLike<Incoming>,
        response: WritableLike<Outgoing>,
        config: any
    ): TContext;

    /**
     * Create parameter resolver.
     * 创建参数解析器
     */
    abstract createParameterResolver(): IParameterResolver;
}

/**
 * Protocol factory token.
 * 协议工厂令牌
 */
export const PROTOCOL_FACTORY = 'PROTOCOL_FACTORY';
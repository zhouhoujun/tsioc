import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver } from '@tsdi/endpoints';
import { AbstractRequestContext, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { HttpTransportStrategy } from '../client/strategies/HttpTransportStrategy';
import { HttpServiceTransportStrategy } from './HttpServiceTransportStrategy';
import { HttpParameterResolver } from './HttpParameterResolver';
import { HttpContext, HttpServRequest, HttpServResponse } from '../context';
import { HttpServConfig } from '@tsdi/endpoints/http';

/**
 * HTTP protocol factory.
 * HTTP 协议工厂，实现 IProtocolFactory 接口
 * Creates all HTTP-specific strategies and context implementations.
 */
@Injectable()
export class HttpProtocolFactory {

    /**
     * Get protocol name.
     * 获取协议名称
     */
    getProtocol(): string {
        return 'http';
    }

    /**
     * Create client transport strategy.
     * 创建客户端传输策略
     */
    createClientStrategy(): HttpTransportStrategy {
        return new HttpTransportStrategy();
    }

    /**
     * Create server transport strategy.
     * 创建服务端传输策略
     */
    createServerStrategy(): HttpServiceTransportStrategy {
        return new HttpServiceTransportStrategy();
    }

    /**
     * Create request context for HTTP.
     * 创建HTTP请求上下文
     */
    createRequestContext(
        request: ReadableLike<Incoming>,
        response: WritableLike<Outgoing>,
        config: HttpServConfig
    ): HttpContext {
        const injector = (config as any).injector ?? (request as any).injector;
        if (!injector) {
            throw new Error('Injector required for HttpContext creation');
        }
        return new HttpContext(
            injector,
            request as HttpServRequest,
            response as HttpServResponse
        );
    }

    /**
     * Create parameter resolver.
     * 创建参数解析器
     */
    createParameterResolver(): HttpParameterResolver {
        return new HttpParameterResolver();
    }
}

export const HTTP_PROTOCOL_FACTORY = 'HTTP_PROTOCOL_FACTORY';
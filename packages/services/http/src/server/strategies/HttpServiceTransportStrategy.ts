import { Injectable, Injector } from '@tsdi/ioc';
import { RequestContext, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { IServiceTransportStrategy, SERVICE_TRANSPORT_STRATEGY, ServerTransportHandle } from '@tsdi/endpoints';
import { ServiceHandler } from '@tsdi/endpoints';
import { HttpContext, HttpServRequest, HttpServResponse } from '../context';

/**
 * HTTP service transport strategy.
 * HTTP 服务端传输策略，实现 IServiceTransportStrategy 接口
 */
@Injectable()
export class HttpServiceTransportStrategy
    implements IServiceTransportStrategy<HttpContext, any> {

    /**
     * Create transport for the HTTP server.
     * 为HTTP服务端创建传输层
     */
    createTransport(injector: Injector, server: any, config: any): ServerTransportHandle {
        // Return the HTTP server instance as the transport handle
        return server;
    }

    /**
     * Bind handler to the HTTP transport.
     * 将处理器绑定到HTTP传输层
     */
    bindHandler(handler: ServiceHandler<HttpContext, any>, transport: ServerTransportHandle): void {
        // HTTP binding happens via ServerTransportFactory in the HTTP server startup
    }

    /**
     * Get supported transport protocol.
     * 获取支持的传输协议
     */
    getProtocol(): string {
        return 'http';
    }

    /**
     * Create request context for incoming HTTP request.
     * 为传入的HTTP请求创建请求上下文
     */
    createContext(
        request: ReadableLike<Incoming>,
        response: WritableLike<Outgoing>,
        config: any
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
}

export const HttpServiceTransportStrategyToken = SERVICE_TRANSPORT_STRATEGY;
import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory } from '@tsdi/common/protocol-factory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver } from '@tsdi/endpoints';
import { AbstractRequestContext, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { TcpTransportStrategy } from './TcpTransportStrategy';
import { TcpClientOptions } from '../options';

/**
 * Minimal TCP protocol factory.
 * TCP 协议工厂实现，遵循 HTTP 模式的最小实现。
 */
@Injectable()
export class TcpProtocolFactory extends IProtocolFactory<IClientTransportStrategy, IServiceTransportStrategy, AbstractRequestContext> {
    getProtocol(): string {
        return 'tcp';
    }

    createClientStrategy(): IClientTransportStrategy {
        // Return a concrete TCP transport strategy instance
        return new TcpTransportStrategy() as any;
    }

    createServerStrategy(): IServiceTransportStrategy {
        throw new Error('NotImplemented');
    }

    createRequestContext(
        request: ReadableLike<Incoming>,
        response: WritableLike<Outgoing>,
        config: any
    ): AbstractRequestContext {
        throw new Error('NotImplemented');
    }

    createParameterResolver(): IParameterResolver {
        throw new Error('NotImplemented');
    }
}

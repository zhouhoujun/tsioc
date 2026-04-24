import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory, PROTOCOL_FACTORY } from '@tsdi/common/protocol-factory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver, AbstractRequestContext } from '@tsdi/endpoints';
import { WsTransportStrategy } from './WsTransportStrategy';

@Injectable()
export class WsProtocolFactory extends IProtocolFactory<IClientTransportStrategy, IServiceTransportStrategy, AbstractRequestContext> {
    getProtocol(): string {
        return 'ws';
    }

    createClientStrategy(): IClientTransportStrategy {
        return new WsTransportStrategy();
    }

    createServerStrategy(): IServiceTransportStrategy {
        throw new Error('NotImplemented');
    }

    createRequestContext(request: any, response: any, config: any): AbstractRequestContext {
        throw new Error('NotImplemented');
    }

    createParameterResolver(): IParameterResolver {
        throw new Error('NotImplemented');
    }
}

export const WsProtocolFactoryToken = PROTOCOL_FACTORY;
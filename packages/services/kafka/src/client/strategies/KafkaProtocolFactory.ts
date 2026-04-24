import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory, PROTOCOL_FACTORY } from '@tsdi/common/protocol-factory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver, AbstractRequestContext } from '@tsdi/endpoints';
import { KafkaTransportStrategy } from './KafkaTransportStrategy';

@Injectable()
export class KafkaProtocolFactory extends IProtocolFactory<IClientTransportStrategy, IServiceTransportStrategy, AbstractRequestContext> {
    getProtocol(): string {
        return 'kafka';
    }

    createClientStrategy(): IClientTransportStrategy {
        return new KafkaTransportStrategy();
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

export const KafkaProtocolFactoryToken = PROTOCOL_FACTORY;
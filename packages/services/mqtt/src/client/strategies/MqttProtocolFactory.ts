import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory, PROTOCOL_FACTORY } from '@tsdi/common/protocol-factory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver, AbstractRequestContext } from '@tsdi/endpoints';
import { MqttTransportStrategy } from './MqttTransportStrategy';

@Injectable()
export class MqttProtocolFactory extends IProtocolFactory<IClientTransportStrategy, IServiceTransportStrategy, AbstractRequestContext> {
    getProtocol(): string {
        return 'mqtt';
    }

    createClientStrategy(): IClientTransportStrategy {
        return new MqttTransportStrategy();
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

export const MqttProtocolFactoryToken = PROTOCOL_FACTORY;
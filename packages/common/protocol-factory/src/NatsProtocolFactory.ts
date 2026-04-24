import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory } from './IProtocolFactory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver, AbstractRequestContext } from '@tsdi/endpoints';

@Injectable()
export class NatsProtocolFactory extends IProtocolFactory<IClientTransportStrategy, IServiceTransportStrategy, AbstractRequestContext> {
    getProtocol(): string {
        return 'nats';
    }

    createClientStrategy(): IClientTransportStrategy {
        return {
            connect: async () => {},
            createRequest: (_pattern: any, _options: any) => { throw new Error('NotImplemented'); },
            initContext: (_ctx: any, _req: any) => {},
            onShutdown: async () => {},
            getConfig: () => ({} as any),
            isConnected: () => false
        } as any;
    }

    createServerStrategy(): IServiceTransportStrategy {
        throw new Error('NotImplemented');
    }

    createRequestContext(_request: any, _response: any, _config: any): AbstractRequestContext {
        throw new Error('NotImplemented');
    }

    createParameterResolver(): IParameterResolver {
        throw new Error('NotImplemented');
    }
}
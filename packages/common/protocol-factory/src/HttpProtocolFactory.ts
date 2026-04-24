import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory } from './IProtocolFactory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver, AbstractRequestContext } from '@tsdi/endpoints';

@Injectable()
export class HttpProtocolFactory extends IProtocolFactory<IClientTransportStrategy, IServiceTransportStrategy, AbstractRequestContext> {
    getProtocol(): string {
        return 'http';
    }

    createClientStrategy(): IClientTransportStrategy {
        return {
            connect: async () => {},
            createRequest: (pattern: any, options: any) => { throw new Error('NotImplemented'); },
            initContext: (_ctx: any, _req: any) => {},
            onShutdown: async () => {},
            getConfig: () => ({} as any),
            isConnected: () => false
        } as any;
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
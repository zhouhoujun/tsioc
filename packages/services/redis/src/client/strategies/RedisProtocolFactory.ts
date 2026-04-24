import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory } from '../../../../common/protocol-factory/src/IProtocolFactory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy } from '@tsdi/endpoints';
import { AbstractRequestContext } from '@tsdi/common';
import { RedisTransportStrategy } from './RedisTransportStrategy';
import { RedisClientConfig } from '../options';
import { IParameterResolver } from '@tsdi/endpoints';

@Injectable()
export class RedisProtocolFactory
    implements IProtocolFactory<RedisTransportStrategy, IServiceTransportStrategy, AbstractRequestContext> {
    getProtocol(): string {
        return 'redis';
    }

    createClientStrategy(): IClientTransportStrategy<any, any, RedisClientConfig> {
        return new RedisTransportStrategy() as any;
    }

    createServerStrategy(): IServiceTransportStrategy {
        // Redis pub/sub is typically client-driven in this pattern. Not implemented on server side here.
        throw new Error('NotImplemented');
    }

    createRequestContext(_request: any, _response: any, _config: any): AbstractRequestContext {
        throw new Error('NotImplemented');
    }

    createParameterResolver(): IParameterResolver {
        throw new Error('NotImplemented');
    }
}

import { Injectable } from '@tsdi/ioc';
import { IProtocolFactory } from '@tsdi/common/protocol-factory';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { IServiceTransportStrategy, IParameterResolver } from '@tsdi/endpoints';
import { UdpTransportStrategy } from './UdpTransportStrategy';
import { UdpServerStrategy } from './UdpServerStrategy';
import { UdpRequestContext } from './UdpRequestContext';

/** UDP protocol factory implementing IProtocolFactory. */
@Injectable()
export class UdpProtocolFactory extends IProtocolFactory<UdpTransportStrategy, UdpServerStrategy, UdpRequestContext> {
    getProtocol(): string {
        return 'udp';
    }

    createClientStrategy(): IClientTransportStrategy {
        // Return a concrete UDP transport strategy instance. See UdpTransportStrategy for details.
        return new UdpTransportStrategy() as any;
    }

    createServerStrategy(): IServiceTransportStrategy {
        // Placeholder server side strategy. Real UDP server transport would be wired differently.
        return new UdpServerStrategy() as any;
    }

    createRequestContext(
        request: any,
        response: any,
        config: any
    ): UdpRequestContext {
        return new UdpRequestContext() as any;
    }

    createParameterResolver(): IParameterResolver {
        // Simple no-op resolver as a placeholder
        return ({} as any) as IParameterResolver;
    }
}

import { Provider } from '@tsdi/ioc';
import { GATEWAY_CONFIG } from './tokens';
import { GatewayConfig, defaultGatewayConfig } from './contracts/GatewayConfig';

export function createAgentGatewayProviders(config?: GatewayConfig): Provider[] {
    return [
        { provide: GATEWAY_CONFIG, useValue: { ...defaultGatewayConfig, ...(config ?? {}) } }
    ];
}

export function provideAgentGateway(config?: GatewayConfig): Provider[] {
    return createAgentGatewayProviders(config);
}

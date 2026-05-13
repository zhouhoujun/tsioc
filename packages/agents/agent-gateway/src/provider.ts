import { ModuleWithProviders } from '@tsdi/ioc';
import { AgentGatewayModule } from './agent-gateway.module';
import { GATEWAY_CONFIG } from './tokens';
import { GatewayConfig, defaultGatewayConfig } from './contracts/GatewayConfig';

export function provideAgentGateway(config?: GatewayConfig): ModuleWithProviders<AgentGatewayModule> {
    return {
        module: AgentGatewayModule,
        providers: [
            { provide: GATEWAY_CONFIG, useValue: { ...defaultGatewayConfig, ...(config ?? {}) } }
        ]
    } as any;
}

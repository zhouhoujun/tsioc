import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { GATEWAY_CONFIG } from './tokens';
import { defaultGatewayConfig } from './contracts/GatewayConfig';
import { GatewayServer } from './gateway/GatewayServer';
import { GatewayBootstrap } from './gateway/GatewayBootstrap';
import { AuthMiddleware } from './auth/AuthMiddleware';
import { PairingStore } from './auth/PairingStore';
import { RateLimiter } from './auth/RateLimiter';
import { SessionQueue } from './auth/SessionQueue';
import { SessionOwnerStore } from './auth/SessionOwnerStore';
import { HealthHandler } from './api/HealthHandler';
import { SessionHandler } from './api/SessionHandler';
import { MemoryHandler } from './api/MemoryHandler';
import { ToolsHandler } from './api/ToolsHandler';
import { EventHandler } from './api/EventHandler';
import { AuditHandler } from './api/AuditHandler';
import { ChatWebSocket } from './ws/ChatWebSocket';
import { GatewayConfig } from './contracts/GatewayConfig';
import { createAgentGatewayProviders } from './provider';

@Module({
    imports: [AgentModule],
    bootstrap: [GatewayBootstrap],
    providers: [
        { provide: GATEWAY_CONFIG, useValue: defaultGatewayConfig },
        AuthMiddleware,
        PairingStore,
        RateLimiter,
        SessionQueue,
        SessionOwnerStore,
        GatewayServer,
        GatewayBootstrap,
        HealthHandler,
        SessionHandler,
        MemoryHandler,
        ToolsHandler,
        EventHandler,
        AuditHandler,
        ChatWebSocket
    ],
    exports: [
        GatewayServer,
        GatewayBootstrap,
        AuthMiddleware,
        PairingStore,
        RateLimiter,
        SessionQueue,
        SessionOwnerStore,
        HealthHandler,
        SessionHandler,
        MemoryHandler,
        ToolsHandler,
        EventHandler,
        AuditHandler,
        ChatWebSocket
    ]
})
export class AgentGatewayModule {
    static withOptions(config?: GatewayConfig): ModuleWithProviders<AgentGatewayModule> {
        return {
            module: AgentGatewayModule,
            providers: createAgentGatewayProviders(config)
        };
    }
}

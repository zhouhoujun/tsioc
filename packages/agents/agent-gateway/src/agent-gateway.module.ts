import { Module } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { GATEWAY_CONFIG } from './tokens';
import { defaultGatewayConfig } from './contracts/GatewayConfig';
import { GatewayServer } from './gateway/GatewayServer';
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
import { ChatWebSocket } from './ws/ChatWebSocket';

@Module({
    imports: [AgentModule],
    providers: [
        { provide: GATEWAY_CONFIG, useValue: defaultGatewayConfig },
        AuthMiddleware,
        PairingStore,
        RateLimiter,
        SessionQueue,
        SessionOwnerStore,
        GatewayServer,
        HealthHandler,
        SessionHandler,
        MemoryHandler,
        ToolsHandler,
        EventHandler,
        ChatWebSocket
    ],
    exports: [
        GatewayServer,
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
        ChatWebSocket
    ]
})
export class AgentGatewayModule {
}

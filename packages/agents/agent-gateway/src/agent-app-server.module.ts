import { Module } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { SessionOwnerStore } from './auth/SessionOwnerStore';
import { SessionHandler } from './api/SessionHandler';
import { MemoryHandler } from './api/MemoryHandler';
import { ToolsHandler } from './api/ToolsHandler';
import { EventHandler } from './api/EventHandler';
import { AppRpcServer } from './app-rpc/AppRpcServer';
import { AppRpcHandler } from './api/AppRpcHandler';
import { StdioAppRpcServer } from './app-rpc/StdioAppRpcServer';

@Module({
    imports: [AgentModule],
    providers: [
        SessionOwnerStore,
        SessionHandler,
        MemoryHandler,
        ToolsHandler,
        EventHandler,
        AppRpcServer,
        AppRpcHandler,
        StdioAppRpcServer
    ],
    exports: [
        SessionOwnerStore,
        SessionHandler,
        MemoryHandler,
        ToolsHandler,
        EventHandler,
        AppRpcServer,
        AppRpcHandler,
        StdioAppRpcServer
    ]
})
export class AgentAppServerModule {
}

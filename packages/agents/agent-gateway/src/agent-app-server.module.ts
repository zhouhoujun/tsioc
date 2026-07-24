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
import { AGENT_CONSOLE_APP_RPC } from '@tsdi/agent';

@Module({
    imports: [AgentModule],
    providers: [
        SessionOwnerStore,
        SessionHandler,
        MemoryHandler,
        ToolsHandler,
        EventHandler,
        AppRpcServer,
        {
            provide: AGENT_CONSOLE_APP_RPC,
            useFactory: (rpc: AppRpcServer) => ({
                request: async (method: string, params?: any, context?: any) => {
                    const response = await rpc.handle({
                        jsonrpc: '2.0',
                        id: Date.now(),
                        method,
                        params
                    }, context);
                    if (!response) {
                        return undefined;
                    }
                    if ('error' in response) {
                        throw new Error(response.error.message);
                    }
                    return response.result;
                },
                stream: async function* (method: string, params?: any, context?: any) {
                    for await (const message of rpc.streamPayload({
                        jsonrpc: '2.0',
                        id: Date.now(),
                        method,
                        params
                    }, context)) {
                        if ('error' in message) {
                            throw new Error(message.error?.message || 'App RPC stream failed');
                        }
                        if ('method' in message && message.method === 'run.turn_stream.chunk') {
                            yield {
                                type: message.params?.chunkType,
                                content: message.params?.content,
                                usage: message.params?.usage,
                                eventType: message.params?.eventType,
                                label: message.params?.label,
                                status: message.params?.status,
                                toolName: message.params?.toolName
                            };
                            continue;
                        }
                        if ('result' in message) {
                            yield {
                                type: 'done',
                                ...message.result
                            };
                        }
                    }
                }
            }),
            deps: [AppRpcServer]
        },
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

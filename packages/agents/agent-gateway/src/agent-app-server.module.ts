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
import { CloudTaskQueue } from './cloud/CloudTaskQueue';
import { QuestionStore } from './app-rpc/QuestionStore';

/** Map a `run.turn_stream.chunk` notification into the shape the console UI consumes. */
export function mapRunTurnStreamChunk(params: any): Record<string, any> {
    return {
        type: params?.chunkType,
        content: params?.content,
        toolCalls: params?.toolCalls,
        usage: params?.usage,
        eventType: params?.eventType,
        label: params?.label,
        status: params?.status,
        toolName: params?.toolName
    };
}

@Module({    imports: [AgentModule],
    providers: [
        SessionOwnerStore,
        SessionHandler,
        MemoryHandler,
        ToolsHandler,
        EventHandler,
        CloudTaskQueue,
        AppRpcServer,
        QuestionStore,
        {
            provide: AGENT_CONSOLE_APP_RPC,
            useFactory: (rpc: AppRpcServer) => ({
                request: async (method: string, params?: any, context?: any) => {
                    const requestContext = {
                        principalId: 'local-system',
                        ...(context || {})
                    };
                    const response = await rpc.handle({
                        jsonrpc: '2.0',
                        id: Date.now(),
                        method,
                        params
                    }, requestContext);
                    if (!response) {
                        return undefined;
                    }
                    if ('error' in response) {
                        throw new Error(response.error.message);
                    }
                    return response.result;
                },
                stream: async function* (method: string, params?: any, context?: any) {
                    const requestContext = {
                        principalId: 'local-system',
                        ...(context || {})
                    };
                    for await (const message of rpc.streamPayload({
                        jsonrpc: '2.0',
                        id: Date.now(),
                        method,
                        params
                    }, requestContext)) {
                        if ('error' in message) {
                            throw new Error(message.error?.message || 'App RPC stream failed');
                        }
                        if ('method' in message && message.method === 'run.turn_stream.chunk') {
                            yield mapRunTurnStreamChunk(message.params);
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
        CloudTaskQueue,
        AppRpcServer,
        AppRpcHandler,
        StdioAppRpcServer,
        QuestionStore
    ]
})
export class AgentAppServerModule {
}

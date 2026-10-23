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
import { ApprovalWebhookNotifier } from './approval/ApprovalWebhookNotifier';

/**
 * Map a `run.turn_stream.chunk` notification into the shape the console UI consumes.
 *
 * Everything is forwarded: a field whitelist here silently dropped approval
 * details (`approvalId` used to be the only one kept, `reason`/`inputSummary`/
 * timing were lost) so the approval panel had to re-render the composed
 * `content` sentence as both `$ input` and `Reason:`. Keeping the payload
 * intact also preserves future chunk fields without a second edit.
 */
export function mapRunTurnStreamChunk(params: any): Record<string, any> {
    return {
        ...(params ?? {}),
        type: params?.chunkType,
        ...(Number.isFinite(Number(params?.durationMs)) ? { durationMs: Number(params.durationMs) } : {})
    };
}

export function toLocalAppRpcError(rpcError: any, fallbackMessage = 'App RPC request failed'): Error {
    const error = new Error(rpcError?.message || fallbackMessage);
    if (rpcError?.data?.modelFailure) {
        (error as any).modelFailure = rpcError.data.modelFailure;
    }
    return error;
}

@Module({    imports: [AgentModule],
    providers: [
        ApprovalWebhookNotifier,
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
            // The notifier is a dependency (not a bootstrap runner) so its
            // @OnEvent subscription is installed whenever the console RPC is used.
            useFactory: (rpc: AppRpcServer, _notifier: ApprovalWebhookNotifier) => ({
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
                        throw toLocalAppRpcError(response.error);
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
                            throw toLocalAppRpcError(message.error, 'App RPC stream failed');
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
            deps: [AppRpcServer, ApprovalWebhookNotifier]
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

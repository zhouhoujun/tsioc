import type { AgentHookContext, AgentHookDefinition, AgentHookExecutionResult, AgentLifecycleHookStage } from './AgentHooks';

export type AgentHookTransportType = 'mcp' | 'prompt' | 'subagent';

export interface AgentHookTransportRequest {
    type: AgentHookTransportType;
    stage: AgentLifecycleHookStage;
    hook: AgentHookDefinition;
    context: AgentHookContext;
    signal?: AbortSignal;
}

/**
 * Host-provided executor for non-command hook transports. Keeping MCP/model/
 * subagent dependencies behind this port lets the core hook manager stay
 * browser-safe and keeps optional integrations out of the runtime.
 */
export abstract class AgentHookTransportExecutor {
    abstract readonly type: AgentHookTransportType;
    abstract execute(request: AgentHookTransportRequest): Promise<Partial<AgentHookExecutionResult>>;
}

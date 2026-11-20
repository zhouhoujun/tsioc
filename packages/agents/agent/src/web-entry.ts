/**
 * Browser-safe entry for @tsdi/agent.
 *
 * The main package index re-exports the TypeOrm-backed stores, which pull
 * `typeorm` (and its node-only dependency chain) into any browser bundle.
 * Web hosts never exercise TypeOrm (all state flows over gateway RPC), so
 * this entry isolates the TypeOrm chain: the agent-ui console graph only
 * sees the in-memory ports and the console UI modules below. `build-web.ts`
 * keeps the residual TypeOrm module chain from crashing at load by stubbing
 * its node-only driver deps and aliasing `global`.
 */
import { Module } from '@tsdi/ioc';

/**
 * Browser-safe module used by `AgentUiModule`.
 *
 * The real `AgentModule` (and everything it exports) is Node-only: it
 * registers TypeORM-backed stores and an `IntervalAgentScheduler` that needs a
 * `TypeormAdapter`. Web hosts talk to the gateway over App RPC and provide
 * `AgentRuntime`/`AgentScheduler` stubs themselves, so this module stays empty.
 */
@Module({})
export class AgentModule {
}

export { AGENT_CONSOLE_APP_RPC } from './ui/AgentConsoleAppRpc';
export type { AgentConsoleAppRpc } from './ui/AgentConsoleAppRpc';
export { AGENT_OPTIONS, AGENT_WORKSPACE_TRUST } from './tokens';
export type { AgentWorkspaceTrustResolver } from './tokens';
export type { AgentOptions } from './options';
export { defaultAgentOptions, DEFAULT_RENDER_POLICY, DEFAULT_APPROVAL_REQUIRED_RULES } from './options';
export { DefaultApprovalStrategy } from './tools/ApprovalStrategy';
export type { ApprovalRule, ApprovalRuleObject, ApprovalRuleExplanation } from './tools/ApprovalStrategy';
export type { AgentPolicyConfig } from './options';
export { defaultAgentProviderRegistry } from './model/provider-registry';
export { asModelFailure, describeModelFailure } from './model/ModelRequestError';
export type { ModelFailure } from './model/ModelRequestError';
export type { ModelErrorKind } from './model/RetryPolicy';
export { ApprovalManager } from './tools/ToolApprovalManager';
export { buildHarnessProjection, formatHarnessTreeLines, formatHarnessListLines } from './harness/harness-projection';
export type { HarnessProjection } from './harness/harness-projection';
export type { DelegationTreeNode } from './harness/DelegationGraphStore';
export type { ExchangeMetricsSnapshot } from './memory/ExchangeMetrics';
export type { AgentTurnResult } from './runtime/AgentTurnResult';
export type { AgentDelegationMode } from './runtime/DelegationMode';
export { AgentRuntime } from './runtime/AgentRuntime';
export { AgentScheduler } from './scheduler/AgentScheduler';
export { AgentTurnCancelledError } from './runtime/AgentTurnCancelledError';
export * from './runtime/AgentEvents';
export type { AgentTurnMessageInput, AgentMessage } from './runtime/AgentMessage';
export type { AgentToolDefinition } from './tools/AgentTool';
export { ToolRegistry } from './tools/ToolRegistry';
export { ToolApprovalManager } from './tools/ToolApprovalManager';
export * from './memory/SessionStore';
export * from './memory/session-message-paging';
export * from './memory/MemoryStore';
export type { TurnDiagnosticsStore } from './harness/TurnDiagnosticsStore';
export type { ContextPreparationReport } from './context/AgentContextManager';
export type { ScheduledAgentTask } from './scheduler/ScheduledAgentTask';
export { initAgentsDoc } from './project/init-agents-doc';
export { normalizeAgentWorkspaceIdentity, basenameAgentPath } from './AgentWorkspacePath';
export { summarizeToolDisplayText } from './tools/ToolSummary';
export { getAgentMessageImageParts } from './runtime/AgentMessage';
export {
    buildUsageSummary,
    collectMessageUsageRecords,
    collectTurnUsageRecords
} from './runtime/UsageSummary';
export * from './memory/nav';
export * from './memory/background-task-store';
export { TypeOrmBackgroundTaskStore } from './memory/TypeOrmBackgroundTaskStore';
export * from './memory/timeline-projection';
export * from './memory/ProjectMemoryService';
export * from './ui/CommandExecution';
export * from './ui/CommandOutputHistory';
export * from './ui/CommandExecutionControl';
export * from './ui/AgentRpcRequestMeta';
export * from './ui/ThreadItemProjection';
export * from './prompt/personality-presets';
export * from './harness/sandbox-exec';

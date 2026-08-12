/**
 * Browser-safe entry for @tsdi/agent.
 *
 * The main package index re-exports the TypeOrm-backed stores, which pull
 * `typeorm` (and its node-only dependency chain) into any browser bundle.
 * Web hosts never exercise TypeOrm (all state flows over gateway RPC), so
 * this entry re-exports only the modules a web console needs, keeping the
 * bundle free of TypeOrm.
 */
export { AGENT_CONSOLE_APP_RPC } from './ui/AgentConsoleAppRpc';
export type { AgentConsoleAppRpc } from './ui/AgentConsoleAppRpc';
export { AGENT_OPTIONS } from './tokens';
export type { AgentOptions } from './options';
export { defaultAgentOptions } from './options';
export { AgentModule } from './agent.module';
export { AgentRuntime } from './runtime/AgentRuntime';
export { AgentScheduler } from './scheduler/AgentScheduler';
export { AgentTurnCancelledError } from './runtime/AgentTurnCancelledError';
export * from './runtime/AgentEvents';
export type { AgentTurnMessageInput, AgentMessage } from './runtime/AgentMessage';
export type { AgentToolDefinition } from './tools/AgentTool';
export { ToolRegistry } from './tools/ToolRegistry';
export { ToolApprovalManager } from './tools/ToolApprovalManager';
export type { SessionStore } from './memory/SessionStore';
export type { MemoryStore } from './memory/MemoryStore';
export type { TurnDiagnosticsStore } from './harness/TurnDiagnosticsStore';
export type { ContextPreparationReport } from './context/AgentContextManager';
export type { SessionSearchMatch } from './memory/SessionStore';
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

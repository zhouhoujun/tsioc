import { GatewayCapabilityRegistry } from '@tsdi/gateway-kit';

/**
 * JSON-RPC methods the gateway answers.
 *
 * The literal tuple is the contract for typed clients (`AgentAppRpcMethod`),
 * the registry is the runtime capability source, and `app.capabilities`
 * exposes both shape-compatible (methods unchanged) and descriptor metadata.
 */
const AGENT_APP_RPC_METHOD_IDS = [
    'app.ping',
    'app.capabilities',
    'app.state',
    'app.inputHistory.get',
    'app.inputHistory.put',
    'command_output.list',
    'command_output.append',
    'command_output.get',
    'command_output.replay',
    'command_output.clear',
    'session.create',
    'session.exists',
    'session.fork',
    'session.list',
    'session.import',
    'session.message.send',
    'session.message.list',
    'session.list_projects',
    'session.list_threads',
    'nav.query',
    'session.messages',
    'session.search',
    'session.side_question',
    'session.undo_turn',
    'session.redo_turn',
    'session.approval_rules.set',
    'session.approval_rules.get',
    'session.inbox.get',
    'session.inbox.replace',
    'session.delete',
    'session.export',
    'session.plan_mode.set',
    'session.plan_mode.get',
    'session.archetype.set',
    'session.archetype.get',
    'session.archetype.list',
    'session.sandbox_mode.set',
    'session.sandbox_mode.get',
    'settings.ui.set',
    'settings.ui.get',
    'settings.store.get',
    'settings.store.set',
    'session.delegation_mode.set',
    'session.delegation_mode.get',
    'session.undo_file',
    'session.redo_file',
    'session.file_snapshot.list',
    'session.set_title',
    'session.set_pinned',
    'session.set_archived',
    'session.section.list',
    'session.section.create',
    'session.section.rename',
    'session.section.move',
    'session.section.delete',
    'session.snapshot.create',
    'session.snapshot.list',
    'session.snapshot.restore',
    'session.snapshot.delete',
    'session.git_snapshot.create',
    'session.git_snapshot.list',
    'session.git_snapshot.diff',
    'session.git_snapshot.revert',
    'session.git_snapshot.unrevert',
    'session.compact',
    'session.share.create',
    'session.share.revoke',
    'session.share.list',
    'run.turn',
    'run.turn_stream',
    'run.cancel',
    'cloud.task.submit',
    'cloud.task.list',
    'cloud.task.get',
    'cloud.task.cancel',
    'cloud.task.apply',
    'approval.list',
    'approval.approve',
    'approval.reject',
    'tools.list',
    'tools.activate',
    'tools.invoke',
    'hooks.list',
    'hooks.trust.list',
    'model.list',
    'model.catalog',
    'model.add',
    'model.activate',
    'provider.test',
    'memory.list',
    'memory.put',
    'memory.search',
    'project_memory.list',
    'project_memory.add',
    'project_memory.remove',
    'events.history',
    'timeline.query',
    'timeline.replay',
    'command_exchange.query',
    'command_exchange.replay',
    'command_exchange.append',
    'command_exchange.metrics',
    'audit.list',
    'todo.get',
    'coding_task.list',
    'coding_task.get',
    'coding_task.diff',
    'coding_task.cancel',
    'coding_task.retry_failed',
    'coding_task.rollback',
    'review_annotations.save',
    'review_annotations.load',
    'review.conclusions.write',
    'review_gate.set',
    'review_gate.clear',
    'review_gate.status',
    'summary_quality.list',
    'summary_quality.stats',
    'summary_quality.trend',
    'usage.stats',
    'compaction_history.list',
    'compaction_history.stats',
    'compaction_history.trend',
    'turn_diagnostics.list',
    'turn_diagnostics.stats',
    'turn_diagnostics.trend',
    'audio.status',
    'audio.start',
    'audio.feed',
    'audio.end',
    'audio.cancel',
    'harness.audit',
    'harness.rejected_actions',
    'harness.retry_rejected_action',
    'harness.profile.list',
    'harness.profile.current',
    'harness.profile.diff',
    'delegation.tree',
    'delegation.lineage',
    'delegation.children',
    'delegation.list',
    'review.diff',
    'review.list',
    'review.get',
    'review.save',
    'project.trust_status',
    'project.trust',
    'goal.create',
    'goal.get',
    'goal.list',
    'goal.link',
    'goal.complete',
    'goal.reopen',
    'background_task.list',
    'background_task.get',
    'background_task.cancel',
] as const;

/** Union of every JSON-RPC method this gateway answers (typed clients). */
export type AgentAppRpcMethod = typeof AGENT_APP_RPC_METHOD_IDS[number];

export const AGENT_APP_RPC_CAPABILITIES = new GatewayCapabilityRegistry(
    AGENT_APP_RPC_METHOD_IDS.map(id => ({ id, kind: 'rpc' as const }))
);

/** Ordered method ids for `app.capabilities`. */
export const AGENT_APP_RPC_METHODS: string[] = AGENT_APP_RPC_CAPABILITIES.methods();

/** Minimal transport a typed client talks to (HTTP JSON-RPC, stdio, WS). */
export interface AgentAppRpcTransport {
    request(method: string, params?: any): Promise<any>;
}

export interface AgentAppRpcClient {
    request<M extends AgentAppRpcMethod>(method: M, params?: unknown): Promise<any>;
    readonly methods: readonly AgentAppRpcMethod[];
    has(method: string): boolean;
}

/**
 * Typed wrapper around a JSON-RPC transport: method names are checked at
 * compile time against `AgentAppRpcMethod` while the transport stays generic.
 */
export function createAgentAppRpcClient(transport: AgentAppRpcTransport): AgentAppRpcClient {
    return {
        request: (method, params) => transport.request(method, params),
        methods: AGENT_APP_RPC_METHODS as readonly AgentAppRpcMethod[],
        has: method => AGENT_APP_RPC_CAPABILITIES.has(method)
    };
}

/**
 * `app.capabilities` payload: protocol/version/features plus the registry
 * descriptors. `methods` keeps the historical shape clients already parse.
 */
export function buildAgentAppRpcCapabilities() {
    return {
        protocol: 'json-rpc-2.0',
        protocolVersion: 1,
        transports: ['http', 'stdio', 'ws'],
        features: { sse: true, ws: true, approvals: true, queue: true },
        methods: AGENT_APP_RPC_METHODS,
        descriptors: AGENT_APP_RPC_CAPABILITIES.list(),
        streamingMethods: ['run.turn_stream']
    };
}

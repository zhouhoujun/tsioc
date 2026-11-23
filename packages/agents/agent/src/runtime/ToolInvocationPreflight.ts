import type { AgentToolDefinition } from '../tools/AgentTool';
import type { AgentToolExecutionReceipt } from './AgentEvents';
import type { ToolLifecycleResult } from './ToolInvocationLifecycle';
import type { ToolSandboxState } from '../harness/ToolSandboxPolicy';
import { ApprovalDecision } from '../tools/ToolApprovalManager';
import { cloneToolInput, summarizeToolInput } from './ToolInvocationSupport';
import { createToolBaseReceipt } from '../harness/tool-receipt';

export interface ToolPreflightHost {
    fail(toolCall: any, input: any, summary: string | undefined, receipt: AgentToolExecutionReceipt, error: string, skip?: { sessionId: string; reason: string }): ToolLifecycleResult;
    getDefinition(name: string, sessionId: string): AgentToolDefinition | undefined;
    checkArchetypeGate(sessionId: string, definition: AgentToolDefinition, input: any): string | undefined;
    ensureActivation(sessionId: string, definition: AgentToolDefinition): Promise<Error | undefined>;
    resolveSandbox(definition: AgentToolDefinition, workspace: string | undefined, supported: boolean, sessionMode: any): ToolSandboxState;
    decorateSandbox(receipt: AgentToolExecutionReceipt, state: ToolSandboxState): AgentToolExecutionReceipt;
    supportsSandbox(): boolean;
    sessionSandboxMode(sessionId: string): any;
    trust?: { isTrusted(workspace: string): boolean };
    isWorkspaceMutating(definition: AgentToolDefinition): boolean;
    resolveTrust(input: any): Promise<{ approved: boolean }>;
    approvalManager?: { checkApproval(name: string, input: any, sessionId: string, force?: boolean): Promise<{ decision: ApprovalDecision }> };
    runHooks(stage: 'onApproval' | 'beforeTool', sessionId: string, context: any): Promise<any[]>;
    isAborted(sessionId: string): boolean;
    throwIfCancelled(sessionId: string): void;
    uuid(): string;
}

export interface ToolPreflightResult {
    failed?: ToolLifecycleResult;
    definition?: AgentToolDefinition;
    toolCallInput?: any;
    inputSummary?: string;
    baseReceipt?: AgentToolExecutionReceipt;
    sandboxState?: ToolSandboxState;
    sandboxReceipt?: AgentToolExecutionReceipt;
}

/** Permission, budget, loop, archetype, sandbox, trust, approval and beforeTool hooks. */
export async function runToolPreflight(
    host: ToolPreflightHost,
    sessionId: string,
    toolCall: { id: string; name: string; input?: any },
    loopDetector: any,
    executionMode: 'sequential' | 'parallel',
    callableTools: AgentToolDefinition[],
    turnContext: any
): Promise<ToolPreflightResult> {
    let toolCallInput = cloneToolInput(toolCall.input);
    let inputSummary = summarizeToolInput(toolCall.name, toolCallInput);
    let baseReceipt = createReceipt(host, toolCall, executionMode, inputSummary);
    const callableToolNames = new Set(callableTools.map(tool => tool.name));
    if (!callableToolNames.has(toolCall.name)) {
        const reason = `Tool "${toolCall.name}" is not available for this turn. Activate or expose it before invoking.`;
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...baseReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
    }
    const turnPermission = turnContext.agent?.permissions?.[toolCall.name];
    if (turnPermission === 'deny') {
        const reason = `Tool "${toolCall.name}" is denied by the turn permission matrix.`;
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...baseReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
    }
    const maxSteps = turnContext.agent?.maxSteps;
    if (maxSteps !== undefined && maxSteps > 0 && (turnContext.toolSteps ?? 0) >= maxSteps) {
        const reason = `Tool "${toolCall.name}" skipped: turn tool-step budget (${maxSteps}) exhausted.`;
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...baseReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
    }
    turnContext.toolSteps = (turnContext.toolSteps ?? 0) + 1;
    const loopResult = loopDetector.record(toolCall.name, toolCallInput);
    if (loopResult.detected && turnContext.recovery) {
        turnContext.recovery.loopPending = true;
    }
    if (loopResult.severity === 'break') {
        const reason = loopResult.reason ?? 'Loop detected';
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...baseReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
    }

    const definition = callableTools.find(tool => tool.name === toolCall.name) ?? host.getDefinition(toolCall.name, sessionId);
    if (!definition) {
        const reason = `Tool "${toolCall.name}" definition was not found.`;
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...baseReceipt, status: 'error', durationMs: 0, error: reason }, reason) };
    }
    const archetypeGate = host.checkArchetypeGate(sessionId, definition, toolCallInput);
    if (archetypeGate) {
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...baseReceipt, status: 'skipped', durationMs: 0, error: archetypeGate }, archetypeGate, { sessionId, reason: archetypeGate }) };
    }
    const activationError = await host.ensureActivation(sessionId, definition);
    if (activationError) {
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...baseReceipt, status: 'error', durationMs: 0, error: activationError.message }, activationError.message) };
    }

    const sandboxState = host.resolveSandbox(definition, turnContext.workspace, host.supportsSandbox(), host.sessionSandboxMode(sessionId));
    let sandboxReceipt = host.decorateSandbox(baseReceipt, sandboxState);
    let trustApprovedForCall = false;
    if (host.trust && turnContext.workspace && host.isWorkspaceMutating(definition) && !host.trust.isTrusted(turnContext.workspace)) {
        const trustApproval = await host.resolveTrust({
            workspaceTrust: host.trust, approvalManager: host.approvalManager,
            workspace: turnContext.workspace, toolName: toolCall.name, sessionId
        });
        if (!trustApproval.approved) {
            const reason = `Workspace '${turnContext.workspace}' is not trusted; tool "${toolCall.name}" would modify it. Run \`tsdi-agent trust ${turnContext.workspace}\` to allow modifications.`;
            return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...sandboxReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
        }
        trustApprovedForCall = true;
    }

    if (host.approvalManager && turnPermission !== 'allow' && !trustApprovedForCall) {
        const forceApproval = turnPermission === 'ask';
        const approval = await host.approvalManager.checkApproval(toolCall.name, toolCallInput, sessionId, forceApproval);
        await host.runHooks('onApproval', sessionId, {
            sessionId, principalId: turnContext.principalId, workspace: turnContext.workspace, stage: 'onApproval',
            toolCall: { id: toolCall.id, name: toolCall.name, input: toolCallInput }, toolDefinition: definition, executionMode,
            approval: {
                toolName: toolCall.name, decision: approval.decision,
                reason: approval.decision === ApprovalDecision.TIMEOUT ? 'timed out'
                    : approval.decision === ApprovalDecision.DENIED ? 'denied'
                        : approval.decision === ApprovalDecision.CANCELLED ? 'cancelled' : undefined
            }
        });
        if (approval.decision === ApprovalDecision.DENIED || approval.decision === ApprovalDecision.TIMEOUT) {
            const reason = approval.decision === ApprovalDecision.TIMEOUT ? `Tool "${toolCall.name}" approval timed out.` : `Tool "${toolCall.name}" was rejected.`;
            return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...sandboxReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
        }
        if (approval.decision === ApprovalDecision.CANCELLED || host.isAborted(sessionId)) {
            host.throwIfCancelled(sessionId);
            const reason = `Tool "${toolCall.name}" approval was cancelled.`;
            return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...sandboxReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
        }
    }

    const beforeToolHookResults = await host.runHooks('beforeTool', sessionId, {
        sessionId, principalId: turnContext.principalId, workspace: turnContext.workspace, stage: 'beforeTool',
        toolCall: { id: toolCall.id, name: toolCall.name, input: toolCallInput }, toolDefinition: definition, executionMode
    });
    if (beforeToolHookResults.some(result => result.action === 'deny')) {
        const reason = `Tool "${toolCall.name}" was denied by a beforeTool hook.`;
        return { failed: host.fail(toolCall, toolCallInput, inputSummary, { ...sandboxReceipt, status: 'skipped', durationMs: 0, error: reason }, reason, { sessionId, reason }) };
    }
    const rewrittenToolInput = beforeToolHookResults.find(result => result.input !== undefined)?.input;
    if (rewrittenToolInput !== undefined) {
        toolCallInput = cloneToolInput(rewrittenToolInput);
        inputSummary = summarizeToolInput(toolCall.name, toolCallInput);
        baseReceipt = createReceipt(host, toolCall, executionMode, inputSummary);
        sandboxReceipt = host.decorateSandbox(baseReceipt, sandboxState);
    }
    return { definition, toolCallInput, inputSummary, baseReceipt, sandboxState, sandboxReceipt };
}

function createReceipt(host: ToolPreflightHost, toolCall: any, mode: 'sequential' | 'parallel', inputSummary?: string): AgentToolExecutionReceipt {
    return createToolBaseReceipt(host.uuid(), toolCall, mode, inputSummary);
}

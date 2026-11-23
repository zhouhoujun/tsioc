import type { ApplicationContext } from '@tsdi/core';
import type { AgentOptions } from '../options';
import { defaultAgentOptions } from '../options';
import type { ToolRegistry } from '../tools/ToolRegistry';
import type { ToolExecutionCoordinator } from '../harness/ToolExecutionCoordinator';
import type { FileSnapshot } from '../harness/FileSnapshotStore';
import type { FileAdapter } from '@tsdi/common';
import type { MemoryStore } from '../memory/MemoryStore';
import type { AgentToolDefinition } from '../tools/AgentTool';
import type { AgentToolExecutionReceipt } from './AgentEvents';
import { AgentToolCompletedEvent, AgentToolFailedEvent } from './AgentEvents';
import { RepeatReadOnlyCallCache } from './tool-repeat-cache';
import { requestSandboxEscalation } from '../harness/sandbox-escalation';
import { spillToolOutput } from '../harness/ToolOutputSpill';
import { effectiveSandboxMode } from '../harness/sandbox-mode';
import { summarizeToolDisplayText } from '../tools/ToolSummary';

export interface ToolExecutionHost {
    app: ApplicationContext;
    options: AgentOptions;
    toolRegistry: ToolRegistry;
    toolExecutionCoordinator?: ToolExecutionCoordinator;
    fileAdapter?: FileAdapter;
    memory: MemoryStore;
    approvalManager?: any;
    now(): number;
    signal(sessionId: string): AbortSignal | undefined;
    sandboxMode(sessionId: string): any;
    fail(toolCall: any, input: any, summary: string | undefined, receipt: AgentToolExecutionReceipt, error: string): any;
    recordLoop(name: string, input: any, output: unknown): void;
    trackPlan(sessionId: string, context: any, name: string, output: unknown): void;
    pushCompensation(sessionId: string, name: string, id: string, capture: unknown): void;
    captureWriteHint(sessionId: string, context: any, toolCall: any, definition: AgentToolDefinition, snapshot: FileSnapshot | null): Promise<void>;
    pushFileSnapshot(sessionId: string, snapshot: FileSnapshot | null): Promise<void>;
    trackEditedFile(context: any, toolCall: any, definition: AgentToolDefinition, snapshot: FileSnapshot | null): void;
}

/** Execute a tool after preflight: capture compensation/snapshot, run, spill, record receipts. */
export async function executeToolInvocation(
    host: ToolExecutionHost,
    sessionId: string,
    toolCall: { id: string; name: string; input?: any },
    loopDetector: any,
    executionMode: 'sequential' | 'parallel',
    toolCallInput: any,
    inputSummary: string | undefined,
    definition: AgentToolDefinition,
    sandboxReceipt: AgentToolExecutionReceipt,
    turnContext: any
): Promise<any> {
    let compensationCapture: unknown;
    let fileSnapshot: FileSnapshot | null = null;
    const tool = host.toolRegistry.getTool(toolCall.name);
    if (tool?.captureCompensation && tool.compensate) {
        try {
            compensationCapture = await tool.captureCompensation(toolCallInput, {
                sessionId, memory: host.memory, principalId: turnContext.principalId, workspace: turnContext.workspace
            });
        } catch {
            compensationCapture = undefined;
        }
    }
    if (tool?.captureFileSnapshot) {
        try {
            const captured = await tool.captureFileSnapshot(toolCallInput, {
                sessionId, memory: host.memory, principalId: turnContext.principalId, workspace: turnContext.workspace
            });
            if (captured) {
                fileSnapshot = { ...captured, timestamp: host.now(), toolName: toolCall.name, toolCallId: toolCall.id, after: null };
            }
        } catch {
            fileSnapshot = null;
        }
    }

    if (host.toolExecutionCoordinator) {
        const outcome = await host.toolExecutionCoordinator.execute({
            sessionId,
            principalId: turnContext.principalId,
            workspace: turnContext.workspace,
            signal: host.signal(sessionId),
            toolCall: { id: toolCall.id, name: toolCall.name, input: toolCallInput },
            definition,
            executionMode,
            inputSummary,
            baseReceipt: sandboxReceipt,
            repeatCache: turnContext.readOnlyResults ??= new RepeatReadOnlyCallCache(),
            sandboxMode: host.sandboxMode(sessionId),
            escalateSandbox: (error: unknown) => requestSandboxEscalation(host.approvalManager, toolCall.name, toolCallInput, sessionId, error instanceof Error ? error : new Error(String(error)))
        });
        if (outcome.redactedOutput !== undefined) {
            host.recordLoop(toolCall.name, toolCallInput, outcome.redactedOutput);
        }
        const maxChars = host.options.context?.maxToolResultChars ?? defaultAgentOptions.context!.maxToolResultChars!;
        const outputStr = outcome.redactedOutput === undefined
            ? JSON.stringify({ error: outcome.error?.message ?? outcome.receipt.error ?? 'tool failed' })
            : (typeof outcome.redactedOutput === 'string' ? outcome.redactedOutput : JSON.stringify(outcome.redactedOutput));
        const truncated = await spillToolOutput(host.fileAdapter, outputStr, maxChars, { workspace: turnContext.workspace, toolCallId: toolCall.id, toolName: toolCall.name, enabled: host.options.context?.spillToolOutput !== false });
        if (outcome.error) {
            return host.fail(toolCall, toolCallInput, inputSummary, outcome.receipt, outcome.error.message);
        }
        host.trackPlan(sessionId, turnContext, toolCall.name, outcome.redactedOutput);
        host.pushCompensation(sessionId, toolCall.name, toolCall.id, compensationCapture);
        await host.captureWriteHint(sessionId, turnContext, toolCall, definition, fileSnapshot);
        await host.pushFileSnapshot(sessionId, fileSnapshot);
        host.trackEditedFile(turnContext, toolCall, definition, fileSnapshot);
        return {
            toolCall,
            content: truncated,
            metadata: { toolCallInput, inputSummary, receipt: outcome.receipt, attempts: outcome.attempts },
            receipt: outcome.receipt,
            structuredOutput: toolCall.name === 'coding_task' ? outcome.redactedOutput : undefined
        };
    }

    const startedAt = host.now();
    try {
        const output = await host.toolRegistry.invoke(toolCall.name, toolCallInput, sessionId, turnContext.principalId, turnContext.workspace);
        host.recordLoop(toolCall.name, toolCallInput, output);
        host.trackPlan(sessionId, turnContext, toolCall.name, output);
        const maxChars = host.options.context?.maxToolResultChars ?? defaultAgentOptions.context!.maxToolResultChars!;
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
        const truncated = await spillToolOutput(host.fileAdapter, outputStr, maxChars, { workspace: turnContext.workspace, toolCallId: toolCall.id, toolName: toolCall.name, enabled: host.options.context?.spillToolOutput !== false });
        const completedReceipt: AgentToolExecutionReceipt = {
            ...sandboxReceipt,
            status: 'success',
            durationMs: Math.max(0, host.now() - startedAt),
            outputSummary: summarizeToolDisplayText(toolCall.name, output, 'output')
        };
        await host.app.publishEvent(new AgentToolCompletedEvent(host.app as any, sessionId, toolCall.name, output, completedReceipt));
        host.pushCompensation(sessionId, toolCall.name, toolCall.id, compensationCapture);
        await host.captureWriteHint(sessionId, turnContext, toolCall, definition, fileSnapshot);
        await host.pushFileSnapshot(sessionId, fileSnapshot);
        host.trackEditedFile(turnContext, toolCall, definition, fileSnapshot);
        return {
            toolCall,
            content: truncated,
            metadata: { toolCallInput, inputSummary, receipt: completedReceipt },
            receipt: completedReceipt,
            structuredOutput: toolCall.name === 'coding_task' ? output : undefined
        };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const failedReceipt: AgentToolExecutionReceipt = {
            ...sandboxReceipt,
            status: 'error',
            durationMs: Math.max(0, host.now() - startedAt),
            error: err.message
        };
        await host.app.publishEvent(new AgentToolFailedEvent(host.app as any, sessionId, toolCall.name, err, failedReceipt));
        return host.fail(toolCall, toolCallInput, inputSummary, failedReceipt, err.message);
    }
}

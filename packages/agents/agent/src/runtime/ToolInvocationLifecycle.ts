import type { ApplicationContext } from '@tsdi/core';
import type { AgentToolDefinition } from '../tools/AgentTool';
import type { SessionStore } from '../memory/SessionStore';
import type { AgentToolExecutionReceipt } from './AgentEvents';
import { AgentToolSkippedEvent } from './AgentEvents';
import { fenceToolOutputIfUntrusted } from '../harness/TrustBoundary';
import type { AgentMessage } from './AgentMessage';
import type { AgentToolCall } from '../model/ModelResponse';

export interface ToolLifecycleResult {
    toolCall: AgentToolCall;
    content: string;
    metadata: Record<string, any>;
    receipt: AgentToolExecutionReceipt;
    error?: Error;
    structuredOutput?: any;
}

export interface ToolInvocationLifecycleHost {
    app: ApplicationContext;
    sessions: SessionStore;
    toolRegistry?: { getTool?(name: string): any; isToolActive?(sessionId: string, name: string): Promise<boolean>; activateTool?(sessionId: string, name: string): Promise<boolean> };
    createMessage(role: 'tool', content: string, name: string, toolCallId: string, metadata: any): AgentMessage;
    runAfterToolHooks(sessionId: string, result: ToolLifecycleResult, workspace?: string): Promise<void>;
}

/** Tool result persistence, skipped events and deferred activation. */
export class ToolInvocationLifecycle {
    constructor(private readonly host: ToolInvocationLifecycleHost) {
    }

    failed(
        toolCall: AgentToolCall,
        toolCallInput: any,
        inputSummary: string | undefined,
        receipt: AgentToolExecutionReceipt,
        error: string,
        skipEvent?: { sessionId: string; reason: string }
    ): ToolLifecycleResult {
        if (skipEvent) {
            void this.host.app.publishEvent(new AgentToolSkippedEvent(this as any, skipEvent.sessionId, toolCall.name, skipEvent.reason, receipt));
        }
        return {
            toolCall,
            content: JSON.stringify({ error }),
            metadata: { toolCallInput, inputSummary, error, receipt },
            receipt,
            error: new Error(error)
        };
    }

    async finalize(sessionId: string, result: ToolLifecycleResult): Promise<void> {
        // External content (web/MCP/browser) is data, not instructions.
        const content = fenceToolOutputIfUntrusted(
            !result.error ? this.host.toolRegistry?.getTool?.(result.toolCall.name) : undefined,
            result.toolCall.name,
            result.content
        );
        await this.host.sessions.append(sessionId, this.host.createMessage('tool', content, result.toolCall.name, result.toolCall.id, result.metadata));
        const state = await this.host.sessions.get(sessionId);
        await this.host.runAfterToolHooks(sessionId, result, String(state.workspace || '').trim() || undefined);
    }

    async ensureActivation(sessionId: string, definition: AgentToolDefinition): Promise<Error | undefined> {
        if (definition.activation?.kind !== 'deferred' || definition.activation?.scope !== 'session') {
            return undefined;
        }
        const registry = this.host.toolRegistry;
        const active = registry?.isToolActive
            ? await registry.isToolActive(sessionId, definition.name)
            : definition.activation?.activated === true;
        if (active) {
            return undefined;
        }
        if (!registry?.activateTool) {
            return new Error(`Tool "${definition.name}" requires session activation, but no activation flow is available.`);
        }
        try {
            const activated = await registry.activateTool(sessionId, definition.name);
            if (!activated && !(await registry.isToolActive?.(sessionId, definition.name))) {
                return new Error(`Tool "${definition.name}" could not be activated for this session.`);
            }
            return undefined;
        } catch (error) {
            return error instanceof Error
                ? error
                : new Error(`Tool "${definition.name}" could not be activated for this session.`);
        }
    }
}

import { Abstract } from '@tsdi/ioc';
import { AgentTool, AgentToolDefinition } from './AgentTool';
import { resolveToolExecutionHints } from '../harness/ToolSandboxPolicy';

/** P2.3: editor passed to `ToolRegistry.transform` (add/hide/rename/namespace). */
export interface ToolTransformEditor {
    add(tool: AgentTool): void;
    hide(name: string): void;
    rename(from: string, to: string): void;
    /** Expose the named tools (default: all) under `<prefix>.<name>`. */
    namespace(prefix: string, names?: string[]): void;
}

@Abstract()
export abstract class ToolRegistry {
    abstract getTools(): AgentTool[];
    abstract getTool(name: string): AgentTool | undefined;
    abstract invoke(name: string, input: any, sessionId: string, principalId?: string, workspace?: string, signal?: AbortSignal, sandboxMode?: import('../harness/sandbox-exec').SandboxMode): Promise<any>;

    /** P2.3: transform the exposed tool set; returns the new revision (0 = unsupported). */
    transform(_editor: (actor: ToolTransformEditor) => void): number {
        return 0;
    }

    /** Monotonic transform revision for prompt-cache/session-snapshot invalidation. */
    get transformRevision(): number {
        return 0;
    }

    getToolDefinitions(sessionId?: string): AgentToolDefinition[] {
        return this.getTools().map(tool => this.toDefinition(tool, sessionId));
    }

    getCallableToolDefinitions(sessionId?: string): AgentToolDefinition[] {
        return this.getToolDefinitions(sessionId);
    }

    getToolDefinition(name: string, sessionId?: string): AgentToolDefinition | undefined {
        const tool = this.getTool(name);
        return tool ? this.toDefinition(tool, sessionId) : undefined;
    }

    async activateTool(_sessionId: string, _name: string): Promise<boolean> {
        return false;
    }

    async isToolActive(_sessionId: string, _name: string): Promise<boolean> {
        return false;
    }

    protected toDefinition(tool: AgentTool, _sessionId?: string): AgentToolDefinition {
        const definition = tool.getDefinition?.() ?? {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: (tool as any).outputSchema,
            toolset: tool.toolset,
            source: tool.source,
            execution: tool.execution,
            canonicalName: (tool as any).canonicalName,
            aliases: (tool as any).aliases,
            tags: (tool as any).tags,
            activation: (tool as any).activation,
            provenance: (tool as any).provenance
        };
        const execution = resolveToolExecutionHints(definition);
        return execution ? { ...definition, execution } : definition;
    }
}

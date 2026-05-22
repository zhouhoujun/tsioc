import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ToolRegistry } from './ToolRegistry';
import { AgentTool, AgentToolDefinition } from './AgentTool';
import { AGENT_TOOLS } from '../tokens';
import { MemoryStore } from '../memory/MemoryStore';
import { ToolActivationStore } from './ToolActivationStore';
import { InMemoryToolActivationStore } from './InMemoryToolActivationStore';

const ALWAYS_ACTIVE_TOOL_NAMES = new Set(['tool_search', 'tool_inspect']);
const ALWAYS_ACTIVE_TOOLSETS = new Set(['registry']);
const LOCAL_ALWAYS_ACTIVE_TOOLSETS = new Set(['builtin', 'utility', 'planning', 'scheduling', 'memory', 'project', 'registry', 'knowledge', 'cron', 'llm', 'canvas', 'approval', 'kanban', 'model_routing']);
const LOCAL_DEFERRED_TOOLSETS = new Set(['filesystem', 'filesystem_write', 'search', 'web', 'browser', 'sessions', 'process', 'http', 'terminal', 'media', 'agent', 'code_execution', 'git', 'communication', 'audio', 'security', 'data', 'capture', 'pipeline', 'backup', 'poll', 'ai_cli']);

@Injectable()
export class LocalToolRegistry extends ToolRegistry {
    private activations: ToolActivationStore;

    constructor(
        @Inject(AGENT_TOOLS, { defaultValue: [] }) private tools: AgentTool[],
        private memory: MemoryStore,
        @Optional() @Inject(ToolActivationStore) activationStore?: ToolActivationStore | null
    ) {
        super();
        this.activations = activationStore ?? new InMemoryToolActivationStore();
    }

    getTools(): AgentTool[] {
        return Array.from(this.getToolMap().values());
    }

    getTool(name: string): AgentTool | undefined {
        return this.getToolMap().get(name);
    }

    getCallableToolDefinitions(sessionId?: string): AgentToolDefinition[] {
        if (!sessionId) {
            return this.getToolDefinitions(sessionId).filter(definition => this.isAlwaysActiveDefinition(definition));
        }
        return this.getToolDefinitions(sessionId).filter(definition => this.shouldExposeFullDefinition(definition, sessionId));
    }

    async activateTool(sessionId: string, name: string): Promise<boolean> {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        this.activations.activate(sessionId, name);
        return true;
    }

    async isToolActive(sessionId: string, name: string): Promise<boolean> {
        const tool = this.getTool(name);
        if (!tool) {
            return false;
        }
        const definition = this.toDefinition(tool, sessionId);
        return this.isAlwaysActiveDefinition(definition)
            || this.hasActivation(sessionId, name);
    }

    async invoke(name: string, input: any, sessionId: string): Promise<any> {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        if (!(await this.isToolActive(sessionId, name))) {
            throw new Error(`Tool '${name}' is not activated for this session. Activate it through the host or approval flow before invoking it.`);
        }
        return tool.invoke(input, {
            sessionId,
            memory: this.memory
        });
    }

    protected toDefinition(tool: AgentTool, sessionId?: string): AgentToolDefinition {
        const definition = super.toDefinition(tool, sessionId);
        const resolvedActivation = this.resolveActivation(definition, sessionId);
        const active = resolvedActivation?.kind === 'always'
            ? true
            : !!sessionId && this.shouldExposeFullDefinition({ ...definition, activation: resolvedActivation }, sessionId);
        if (!sessionId || active) {
            return resolvedActivation ? { ...definition, activation: resolvedActivation } : definition;
        }
        return {
            name: definition.name,
            description: definition.description,
            toolset: definition.toolset,
            source: definition.source,
            execution: definition.execution,
            canonicalName: definition.canonicalName,
            aliases: definition.aliases,
            tags: definition.tags,
            activation: resolvedActivation,
            provenance: definition.provenance
        };
    }

    private shouldExposeFullDefinition(definition: AgentToolDefinition, sessionId: string): boolean {
        if (this.isAlwaysActiveDefinition(definition)) {
            return true;
        }
        return this.hasActivation(sessionId, definition.name);
    }

    private resolveActivation(definition: AgentToolDefinition, sessionId?: string): AgentToolDefinition['activation'] {
        const activation = definition.activation ?? this.inferActivation(definition);
        if (!activation) {
            return undefined;
        }
        if (activation.kind === 'always') {
            return { ...activation, activated: true };
        }
        return {
            ...activation,
            activated: !!sessionId && this.hasActivation(sessionId, definition.name)
        };
    }

    private inferActivation(definition: AgentToolDefinition): AgentToolDefinition['activation'] {
        if (definition.source !== 'local') {
            return definition.activation;
        }
        if (ALWAYS_ACTIVE_TOOL_NAMES.has(definition.name) || ALWAYS_ACTIVE_TOOLSETS.has(definition.toolset ?? '') || LOCAL_ALWAYS_ACTIVE_TOOLSETS.has(definition.toolset ?? '')) {
            return { kind: 'always', scope: 'global' };
        }
        if (LOCAL_DEFERRED_TOOLSETS.has(definition.toolset ?? '')) {
            return { kind: 'deferred', scope: 'session' };
        }
        return definition.activation;
    }

    private getToolMap(): Map<string, AgentTool> {
        const deduped = new Map<string, AgentTool>();
        this.tools.forEach(tool => {
            if (!deduped.has(tool.name)) {
                deduped.set(tool.name, tool);
            }
        });
        return deduped;
    }

    private isAlwaysActiveDefinition(definition: AgentToolDefinition): boolean {
        return ALWAYS_ACTIVE_TOOL_NAMES.has(definition.name)
            || ALWAYS_ACTIVE_TOOLSETS.has(definition.toolset ?? '')
            || definition.activation?.kind === 'always';
    }

    private hasActivation(sessionId: string, name: string): boolean {
        return this.activations.isActive(sessionId, name);
    }
}

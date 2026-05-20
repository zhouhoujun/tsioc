import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ToolRegistry } from './ToolRegistry';
import { AgentTool, AgentToolDefinition } from './AgentTool';
import { AGENT_MEMORY_STORE, AGENT_TOOLS, AGENT_TOOL_ACTIVATION_STORE } from '../tokens';
import { MemoryStore } from '../memory/MemoryStore';
import { ToolActivationStore } from './ToolActivationStore';
import { InMemoryToolActivationStore } from './InMemoryToolActivationStore';

const ALWAYS_ACTIVE_TOOL_NAMES = new Set(['tool_search', 'tool_inspect']);
const ALWAYS_ACTIVE_TOOLSETS = new Set(['registry']);

@Injectable()
export class LocalToolRegistry extends ToolRegistry {
    private activations: ToolActivationStore;

    constructor(
        @Inject(AGENT_TOOLS, { defaultValue: [] }) private tools: AgentTool[],
        @Inject(AGENT_MEMORY_STORE) private memory: MemoryStore,
        @Optional() @Inject(AGENT_TOOL_ACTIVATION_STORE, { defaultValue: null }) activationStore?: ToolActivationStore | null
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
        const definition = super.toDefinition(tool, sessionId);
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
        const active = !!sessionId && this.shouldExposeFullDefinition(definition, sessionId);
        const activation = definition.activation
            ? { ...definition.activation, activated: definition.activation.kind === 'always' ? true : active }
            : undefined;
        if (!sessionId || active) {
            return activation ? { ...definition, activation } : definition;
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
            activation,
            provenance: definition.provenance
        };
    }

    private shouldExposeFullDefinition(definition: AgentToolDefinition, sessionId: string): boolean {
        if (this.isAlwaysActiveDefinition(definition)) {
            return true;
        }
        return this.hasActivation(sessionId, definition.name);
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

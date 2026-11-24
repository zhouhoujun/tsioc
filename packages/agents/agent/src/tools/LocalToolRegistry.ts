import { Inject, Injectable } from '@tsdi/ioc';
import { AgentTool, AgentToolDefinition } from './AgentTool';
import { AGENT_TOOLS } from '../tokens';
import { MemoryStore } from '../memory/MemoryStore';
import { SessionStore } from '../memory/SessionStore';
import { ToolActivationStore } from './ToolActivationStore';
import { ToolRegistry, ToolTransformEditor } from './ToolRegistry';

const ALWAYS_ACTIVE_TOOL_NAMES = new Set(['tool_search', 'tool_inspect']);
const ALWAYS_ACTIVE_TOOLSETS = new Set(['registry']);
const LOCAL_ALWAYS_ACTIVE_TOOLSETS = new Set(['builtin', 'utility', 'planning', 'scheduling', 'memory', 'project', 'registry', 'knowledge', 'cron', 'llm', 'canvas', 'approval', 'kanban', 'model_routing']);
const LOCAL_DEFERRED_TOOLSETS = new Set(['filesystem', 'filesystem_write', 'search', 'web', 'browser', 'sessions', 'process', 'http', 'terminal', 'media', 'agent', 'code_execution', 'git', 'communication', 'audio', 'security', 'data', 'capture', 'pipeline', 'backup', 'poll', 'ai_cli']);

@Injectable()
export class LocalToolRegistry extends ToolRegistry {

    /** P2.3: additive tools/hidden names/exposed renames applied by `transform`. */
    private transformedAdded: AgentTool[] = [];
    private transformedHidden = new Set<string>();
    private transformedNames = new Map<string, string>();
    private exposedNames = new Map<string, string>();
    private revision = 0;

    constructor(
        @Inject(AGENT_TOOLS, { defaultValue: [] }) private tools: AgentTool[],
        private memory: MemoryStore,
        private sessionStore: SessionStore,
        private activationStore: ToolActivationStore
    ) {
        super();
    }

    get transformRevision(): number {
        return this.revision;
    }

    getTools(): AgentTool[] {
        return Array.from(this.getToolMap().values());
    }

    getTool(name: string): AgentTool | undefined {
        return this.getToolMap().get(name);
    }

    getToolDefinition(name: string, sessionId?: string): AgentToolDefinition | undefined {
        const tool = this.getTool(this.resolveRawName(name));
        return tool ? this.toDefinition(tool, sessionId) : undefined;
    }

    /** P2.3: add/hide/rename/namespace tools; returns the new revision. */
    transform(editor: (actor: ToolTransformEditor) => void): number {
        const added: AgentTool[] = [];
        const hidden: string[] = [];
        const renames: Array<[string, string]> = [];
        editor({
            add: tool => { if (tool?.name) added.push(tool); },
            hide: name => { if (name) hidden.push(name); },
            rename: (from, to) => { if (from && to) renames.push([from, to]); },
            namespace: (prefix, names) => {
                if (!prefix) return;
                const targets = names?.length ? names.slice() : Array.from(this.getRawToolMap().keys());
                for (const name of targets) {
                    renames.push([name, `${prefix}.${name}`]);
                }
            }
        });
        for (const tool of added) {
            if (!this.transformedAdded.some(existing => existing.name === tool.name)) {
                this.transformedAdded.push(tool);
            }
        }
        for (const name of hidden) {
            this.transformedHidden.add(name);
        }
        for (const [from, to] of renames) {
            this.transformedNames.set(from, to);
        }
        this.rebuildExposedNames();
        this.revision++;
        return this.revision;
    }

    getCallableToolDefinitions(sessionId?: string): AgentToolDefinition[] {
        if (!sessionId) {
            return this.getToolDefinitions(sessionId).filter(definition => this.isAlwaysActiveDefinition(definition));
        }
        return this.getTools()
            .map(tool => this.toCallableDefinition(tool, sessionId))
            .filter(definition => this.isCallableDefinition(definition, sessionId));
    }

    async activateTool(sessionId: string, name: string): Promise<boolean> {
        const raw = this.resolveRawName(name);
        const tool = this.getTool(raw);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        this.activationStore.activate(sessionId, raw);
        return true;
    }

    async isToolActive(sessionId: string, name: string): Promise<boolean> {
        const raw = this.resolveRawName(name);
        const tool = this.getTool(raw);
        if (!tool) {
            return false;
        }
        const definition = super.toDefinition(tool, sessionId);
        const activation = this.resolveActivation(definition, sessionId);
        return this.isAlwaysActiveDefinition({ ...definition, activation })
            || this.hasActivation(sessionId, raw);
    }

    async invoke(name: string, input: any, sessionId: string, principalId?: string, workspace?: string, signal?: AbortSignal, sandboxMode?: import('../harness/sandbox-exec').SandboxMode): Promise<any> {
        const raw = this.resolveRawName(name);
        const tool = this.getTool(raw);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        if (!(await this.isToolActive(sessionId, raw))) {
            throw new Error(`Tool '${name}' is not activated for this session. Activate it through the host or approval flow before invoking it.`);
        }
        const resolvedWorkspace = String(workspace || (this.sessionStore ? (await this.sessionStore.get(sessionId)).workspace : '') || '').trim() || undefined;
        return tool.invoke(input, {
            sessionId,
            memory: this.memory,
            principalId,
            workspace: resolvedWorkspace,
            sandboxMode,
            signal
        });
    }

    protected toDefinition(tool: AgentTool, sessionId?: string): AgentToolDefinition {
        const definition = super.toDefinition(tool, sessionId);
        const resolvedActivation = this.resolveActivation(definition, sessionId);
        const active = resolvedActivation?.kind === 'always'
            ? true
            : !!sessionId && this.shouldExposeFullDefinition({ ...definition, activation: resolvedActivation }, sessionId);
        if (!sessionId || active) {
            return this.renameDefinition(resolvedActivation ? { ...definition, activation: resolvedActivation } : definition);
        }
        return this.renameDefinition({
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
        });
    }

    private toCallableDefinition(tool: AgentTool, sessionId: string): AgentToolDefinition {
        const definition = super.toDefinition(tool, sessionId);
        const resolvedActivation = this.resolveActivation(definition, sessionId);
        return this.renameDefinition(resolvedActivation ? { ...definition, activation: resolvedActivation } : definition);
    }

    private renameDefinition(definition: AgentToolDefinition): AgentToolDefinition {
        if (!this.transformedNames.size) {
            return definition;
        }
        const exposed = this.transformedNames.get(definition.name);
        if (!exposed) {
            return definition;
        }
        return { ...definition, name: exposed, canonicalName: definition.canonicalName ?? definition.name };
    }

    private resolveRawName(name: string): string {
        return this.exposedNames.get(name) ?? name;
    }

    private rebuildExposedNames(): void {
        this.exposedNames.clear();
        for (const [raw, exposed] of this.transformedNames) {
            this.exposedNames.set(exposed, raw);
        }
    }

    private isCallableDefinition(definition: AgentToolDefinition, sessionId: string): boolean {
        if (this.isAlwaysActiveDefinition(definition)) {
            return true;
        }
        if (definition.activation?.kind === 'deferred' && definition.activation?.scope === 'session') {
            return true;
        }
        return this.hasActivation(sessionId, this.resolveRawName(definition.name));
    }

    private shouldExposeFullDefinition(definition: AgentToolDefinition, sessionId: string): boolean {
        if (this.isAlwaysActiveDefinition(definition)) {
            return true;
        }
        return this.hasActivation(sessionId, this.resolveRawName(definition.name));
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
        return this.getRawToolMap();
    }

    private getRawToolMap(): Map<string, AgentTool> {
        const deduped = new Map<string, AgentTool>();
        [...this.tools, ...this.transformedAdded].forEach(tool => {
            if (!deduped.has(tool.name)) {
                deduped.set(tool.name, tool);
            }
        });
        for (const hidden of this.transformedHidden) {
            deduped.delete(hidden);
        }
        return deduped;
    }

    private isAlwaysActiveDefinition(definition: AgentToolDefinition): boolean {
        return ALWAYS_ACTIVE_TOOL_NAMES.has(definition.name)
            || ALWAYS_ACTIVE_TOOLSETS.has(definition.toolset ?? '')
            || definition.activation?.kind === 'always';
    }

    private hasActivation(sessionId: string, name: string): boolean {
        return this.activationStore.isActive(sessionId, name);
    }
}

import type { AgentOptions, AgentPolicyResolution } from '../options';
import type { AgentMessage } from './AgentMessage';
import type { AgentToolDefinition } from '../tools/AgentTool';
import type { SessionStore } from '../memory/SessionStore';
import type { SandboxMode } from '../harness/sandbox-exec';
import type { TurnExecutionContext } from './TurnExecutionContext';
import {
    AgentArchetype,
    DEFAULT_ARCHETYPE,
    buildArchetypeSwitchMessage,
    listArchetypes,
    resolveArchetype
} from '../archetype/AgentArchetype';
import { AgentDelegationMode, DEFAULT_DELEGATION_MODE, normalizeDelegationMode } from './DelegationMode';

export interface SessionModeHost {
    options: AgentOptions;
    sessions: SessionStore;
    messages(sessionId: string): Promise<AgentMessage[]>;
    createMessage(role: AgentMessage['role'], content: string): AgentMessage;
    resolveDefaultArchetype(): AgentPolicyResolution<string>;
}

/**
 * Per-session mode state: toolset filters, model profile overrides, plan /
 * archetype selection, sandbox mode and delegation mode.
 *
 * Audit/review/plan archetypes are pure state plus prompts; moving them here
 * keeps DefaultAgentRuntime a facade over the turn pipeline.
 */
export class SessionModeController {
    readonly toolFilters = new Map<string, Set<string>>();
    readonly modelProfiles = new Map<string, string>();
    readonly planModes = new Set<string>();
    readonly archetypes = new Map<string, string>();
    readonly sandboxModes = new Map<string, SandboxMode>();
    readonly delegationModes = new Map<string, AgentDelegationMode>();
    private readonly pendingSwitches = new Map<string, Promise<void>>();

    constructor(private readonly host: SessionModeHost) {
    }

    setToolFilter(sessionId: string, toolsets: string[]): void {
        if (toolsets.length === 0) {
            this.toolFilters.delete(sessionId);
        } else {
            this.toolFilters.set(sessionId, new Set(toolsets));
        }
    }

    clearToolFilter(sessionId: string): void {
        this.toolFilters.delete(sessionId);
    }

    applyToolFilter(sessionId: string, definitions: AgentToolDefinition[]): AgentToolDefinition[] {
        const filter = this.toolFilters.get(sessionId);
        if (!filter || filter.size === 0) {
            return definitions;
        }
        return definitions.filter(definition => definition.toolset && filter.has(definition.toolset));
    }

    setModelProfile(sessionId: string, profileName: string): void {
        this.modelProfiles.set(sessionId, profileName);
    }

    clearModelProfile(sessionId: string): void {
        this.modelProfiles.delete(sessionId);
    }

    modelProfile(sessionId: string): string | undefined {
        return this.modelProfiles.get(sessionId);
    }

    setPlanMode(sessionId: string, enabled: boolean): void {
        if (enabled) {
            this.setArchetype(sessionId, 'plan');
        } else {
            this.setArchetype(sessionId, this.host.resolveDefaultArchetype().value);
        }
    }

    isPlanMode(sessionId: string): boolean {
        return this.archetypeConfig(sessionId)?.readOnly === true || this.planModes.has(sessionId);
    }

    setArchetype(sessionId: string, archetype: string | null | undefined): void {
        const previous = this.getArchetype(sessionId);
        const next = archetype
            ? this.normalizeArchetypeName(archetype)
            : this.host.resolveDefaultArchetype().value;
        if (!next) {
            this.archetypes.delete(sessionId);
        } else {
            this.archetypes.set(sessionId, next);
        }
        const config = this.archetypeConfig(sessionId);
        if (config?.readOnly) {
            this.planModes.add(sessionId);
        } else {
            this.planModes.delete(sessionId);
        }
        if (next !== previous) {
            const switchConfig = resolveArchetype(this.host.options.archetypes, next);
            if (switchConfig) {
                const previousPending = this.pendingSwitches.get(sessionId) ?? Promise.resolve();
                const pending = previousPending
                    .then(() => this.appendSwitchMessage(sessionId, switchConfig, previous))
                    .finally(() => {
                        if (this.pendingSwitches.get(sessionId) === pending) {
                            this.pendingSwitches.delete(sessionId);
                        }
                    });
                this.pendingSwitches.set(sessionId, pending);
            }
        }
    }

    async waitForPendingSwitch(sessionId: string): Promise<void> {
        await this.pendingSwitches.get(sessionId);
    }

    getArchetype(sessionId: string): string {
        return this.resolveSessionArchetype(sessionId).value;
    }

    resolveSessionArchetype(sessionId: string): AgentPolicyResolution<string> {
        const sessionArchetype = this.archetypes.get(sessionId);
        if (sessionArchetype) {
            return { value: sessionArchetype, source: 'session' };
        }
        return this.host.resolveDefaultArchetype();
    }

    listArchetypeNames(): string[] {
        return listArchetypes(this.host.options.archetypes).map(archetype => archetype.name);
    }

    listAgentProfiles(): AgentArchetype[] {
        return listArchetypes(this.host.options.archetypes);
    }

    archetypeConfig(sessionId: string): AgentArchetype | undefined {
        return resolveArchetype(this.host.options.archetypes, this.getArchetype(sessionId));
    }

    setSandboxMode(sessionId: string, mode?: SandboxMode | null): void {
        if (mode == null) {
            this.sandboxModes.delete(sessionId);
            return;
        }
        this.sandboxModes.set(sessionId, mode);
    }

    sandboxMode(sessionId: string): SandboxMode | undefined {
        return this.sandboxModes.get(sessionId);
    }

    setDelegationMode(sessionId: string, mode?: AgentDelegationMode | null): void {
        if (mode == null) {
            this.delegationModes.delete(sessionId);
            return;
        }
        const normalized = normalizeDelegationMode(mode);
        if (!normalized) {
            return;
        }
        this.delegationModes.set(sessionId, normalized);
    }

    /** G29: default delegation mode with the policy layer that supplied it (policy > legacy option > schema). */
    resolveDefaultDelegationMode(): AgentPolicyResolution<AgentDelegationMode> {
        const policyMode = normalizeDelegationMode(this.host.options.policy?.delegationMode);
        if (policyMode) {
            return { value: policyMode, source: this.host.options.policy?.source ?? 'workspace' };
        }
        const legacyMode = normalizeDelegationMode(this.host.options.delegationMode);
        if (legacyMode) {
            return {
                value: legacyMode,
                source: legacyMode === DEFAULT_DELEGATION_MODE ? 'default' : 'workspace'
            };
        }
        return { value: DEFAULT_DELEGATION_MODE, source: 'default' };
    }

    /** G29: session delegation mode with observable source; falls back to the default chain when no session override exists. */
    resolveSessionDelegationMode(sessionId: string): AgentPolicyResolution<AgentDelegationMode> {
        const sessionMode = this.delegationModes.get(sessionId);
        if (sessionMode) {
            return { value: sessionMode, source: 'session' };
        }
        return this.resolveDefaultDelegationMode();
    }

    getDelegationMode(sessionId: string): AgentDelegationMode {
        return this.resolveSessionDelegationMode(sessionId).value;
    }

    /** G29: effective mode for a round: per-turn agent config > session override > option default. */
    resolveDelegationMode(sessionId: string, turnContext?: TurnExecutionContext): AgentDelegationMode {
        const perTurn = turnContext?.agent?.delegationMode;
        if (perTurn) {
            return normalizeDelegationMode(perTurn) ?? DEFAULT_DELEGATION_MODE;
        }
        return this.getDelegationMode(sessionId);
    }

    /**
     * Archetype tool gate: deny rules win, allow rules pass, then a readOnly
     * archetype denies write-capable tools unless the input satisfies a
     * configured write path. Returns the denial reason or undefined to allow.
     */
    checkToolGate(sessionId: string, definition: AgentToolDefinition, input: Record<string, any>): string | undefined {
        const archetype = this.archetypeConfig(sessionId);
        if (!archetype) {
            return undefined;
        }
        const permission = archetype.permissions;
        const toolName = definition.name;

        if (permission?.deny?.some(pattern => this.matchToolPattern(toolName, pattern))) {
            return `Tool "${toolName}" is denied by the "${archetype.name}" archetype.`;
        }
        if (permission?.allow?.length && permission.allow.some(pattern => this.matchToolPattern(toolName, pattern))) {
            return undefined;
        }
        if (archetype.readOnly === true && !definition.execution?.readOnly) {
            if (permission?.writePaths?.length && this.inputMatchesWritePaths(input, permission.writePaths)) {
                return undefined;
            }
            return `Tool "${toolName}" is disabled in ${archetype.name} mode (read-only session).`;
        }
        return undefined;
    }

    matchToolPattern(toolName: string, pattern: string): boolean {
        if (pattern.endsWith('*')) {
            return toolName.startsWith(pattern.slice(0, -1));
        }
        return toolName === pattern;
    }

    inputMatchesWritePaths(input: Record<string, any>, writePaths: string[]): boolean {
        const candidates: string[] = [];
        const collect = (value: any): void => {
            if (typeof value === 'string') {
                candidates.push(value);
            } else if (Array.isArray(value)) {
                value.forEach(collect);
            } else if (value && typeof value === 'object') {
                Object.values(value).forEach(collect);
            }
        };
        collect(input);
        return candidates.some(value => writePaths.some(prefix => {
            const normalizedValue = value.replace(/^[./\\]+/, '');
            const normalizedPrefix = prefix.replace(/^[./\\]+/, '').replace(/\/+$/, '');
            return normalizedValue === normalizedPrefix
                || normalizedValue.startsWith(normalizedPrefix + '/')
                || normalizedValue.startsWith(normalizedPrefix + '\\');
        }));
    }

    private normalizeArchetypeName(name: string): string {
        const lower = String(name).trim().toLowerCase();
        if (lower === 'planner') {
            return 'plan';
        }
        if (lower === 'execute' || lower === 'coder' || lower === 'default') {
            return DEFAULT_ARCHETYPE;
        }
        if (lower === 'audit') {
            return 'review';
        }
        return lower;
    }

    private async appendSwitchMessage(sessionId: string, config: AgentArchetype, previous: string): Promise<void> {
        try {
            const existing = await this.host.messages(sessionId);
            if (!existing.length) {
                return;
            }
            await this.host.sessions.append(
                sessionId,
                this.host.createMessage('system', buildArchetypeSwitchMessage(config, previous))
            );
        } catch {
            // a failed switch note must never break archetype switching
        }
    }
}

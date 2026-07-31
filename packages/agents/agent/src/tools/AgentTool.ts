import { MemoryStore } from '../memory/MemoryStore';
import { SandboxPolicy } from '../harness/SandboxExecutor';

export interface AgentToolContext {
    sessionId: string;
    memory: MemoryStore;
    principalId?: string;
    workspace?: string;
}

export interface AgentToolRetryPolicy {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
}

export interface AgentToolAuthorizationPolicy {
    requiredPrincipals?: string[];
    allowAnonymous?: boolean;
    allowLocalAnonymous?: boolean;
}

export interface AgentToolRateLimitPolicy {
    maxCalls: number;
    windowMs: number;
    scope?: 'session' | 'global';
}

export type AgentToolSandboxCapability =
    | 'readonly_fs'
    | 'workspace_write'
    | 'process_exec'
    | 'vcs_exec'
    | 'code_exec'
    | 'network_fetch'
    | 'gui_capture';

export interface AgentToolExecutionHints {
    readOnly?: boolean;
    sideEffect?: boolean;
    requiresSequential?: boolean;
    timeoutMs?: number;
    retryPolicy?: AgentToolRetryPolicy;
    authorization?: AgentToolAuthorizationPolicy;
    rateLimit?: AgentToolRateLimitPolicy;
    redactOutput?: boolean;
    auditEnabled?: boolean;
    sandboxCapability?: AgentToolSandboxCapability;
    sandbox?: SandboxPolicy;
    isolationLevel?: 'none' | 'process' | 'container';
    resourceLimits?: {
        cpuTimeMs?: number;
        memoryBytes?: number;
        wallTimeMs?: number;
        maxProcesses?: number;
        maxFsWrites?: number;
    };
}

export type AgentToolOrigin = 'builtin' | 'skill' | 'mcp';

export interface AgentToolActivationMetadata {
    kind: 'always' | 'deferred' | 'attach';
    scope: 'global' | 'session';
    activated?: boolean;
}

export interface AgentToolProvenance {
    origin: AgentToolOrigin;
    providerId?: string;
    skillId?: string;
    serverId?: string;
    sessionScoped?: boolean;
}

export interface AgentToolDefinition {
    name: string;
    description: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    toolset?: string;
    source?: string;
    execution?: AgentToolExecutionHints;
    canonicalName?: string;
    aliases?: string[];
    tags?: string[];
    activation?: AgentToolActivationMetadata;
    provenance?: AgentToolProvenance;
}

export interface AgentCapabilityBundle {
    name: string;
    description?: string;
    tools: string[];
    defaultEnabled?: boolean;
    deferredActivation?: boolean;
    enabled?: boolean;
    source?: AgentToolOrigin;
    providerId?: string;
    activation?: Omit<AgentToolActivationMetadata, 'activated'>;
    sessionScoped?: boolean;
}

export interface AgentTool extends AgentToolDefinition {
    getDefinition?(): AgentToolDefinition;
    invoke(input: any, context: AgentToolContext): Promise<any>;
    /**
     * Called by the runtime before invoke() so a side-effecting tool can
     * snapshot the state it would need to undo the upcoming operation.
     * Returning undefined means no compensation entry is recorded.
     */
    captureCompensation?(input: any, context: AgentToolContext): Promise<unknown> | unknown;
    /**
     * Called by the runtime (LIFO over the turn's successful side-effecting
     * calls) when the turn is cancelled or fails, restoring the state that
     * captureCompensation() snapshot beforehand.
     */
    compensate?(captured: unknown, context: AgentToolContext): Promise<void> | void;
}

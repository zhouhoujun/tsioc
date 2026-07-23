import { MemoryStore } from '../memory/MemoryStore';

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
}

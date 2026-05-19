import { AgentModelOptions } from './model/ModelProviderOptions';

export interface AgentSessionOptions {
    summaryThreshold?: number;
    recentMessages?: number;
}

export interface AgentContextOptions {
    /** Max estimated tokens for conversation history sent to model */
    maxHistoryTokens?: number;
    /** Max memory records included in context */
    maxMemoryRecords?: number;
    /** Max chars per tool result before truncation */
    maxToolResultChars?: number;
}

export interface AgentToolOptions {
    /** Whether to execute independent tool calls in parallel */
    parallelExecution?: boolean;
    /** Max parallel tool calls */
    maxParallelTools?: number;
    /** Tool names that are safe to run in parallel (read-only tools) */
    parallelSafeTools?: string[];
    /** Tool names/patterns requiring human approval before execution */
    requireApproval?: string[];
    /** Approval timeout in ms */
    approvalTimeoutMs?: number;
}

export interface AgentSchedulerOptions {
    enabled?: boolean;
}

export interface AgentUIOptions {
    title?: string;
}

export interface AgentBootstrapTurnOptions {
    enabled?: boolean;
    sessionId?: string;
    input?: string;
    output?: string;
}

export interface AgentOptions {
    name?: string;
    maxToolRounds?: number;
    session?: AgentSessionOptions;
    context?: AgentContextOptions;
    tools?: AgentToolOptions;
    scheduler?: AgentSchedulerOptions;
    ui?: AgentUIOptions;
    model?: AgentModelOptions;
    bootstrapTurn?: AgentBootstrapTurnOptions;
}

export const defaultAgentOptions: AgentOptions = {
    name: 'HermesAgent',
    maxToolRounds: 4,
    session: {
        summaryThreshold: 8,
        recentMessages: 6
    },
    context: {
        maxHistoryTokens: 32000,
        maxMemoryRecords: 50,
        maxToolResultChars: 8000
    },
    tools: {
        parallelExecution: false,
        maxParallelTools: 5,
        parallelSafeTools: ['memory.search', 'time', 'echo', 'web_search', 'session_search'],
        requireApproval: ['shell.exec', 'fs.write', 'fs.delete', 'sudo.exec', 'deploy'],
        approvalTimeoutMs: 30000
    },
    scheduler: {
        enabled: true
    },
    ui: {
        title: 'Hermes Agent Console'
    },
    model: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com',
        apiKeyEnv: 'DEEPSEEK_API_KEY',
        timeoutMs: 120000
    },
    bootstrapTurn: {
        enabled: false,
        sessionId: 'default',
        input: '',
        output: ''
    }
};

export function mergeAgentOptions(options?: AgentOptions): AgentOptions {
    return {
        ...defaultAgentOptions,
        ...(options ?? {}),
        session: {
            ...defaultAgentOptions.session,
            ...(options?.session ?? {})
        },
        context: {
            ...defaultAgentOptions.context,
            ...(options?.context ?? {})
        },
        tools: {
            ...defaultAgentOptions.tools,
            ...(options?.tools ?? {})
        },
        scheduler: {
            ...defaultAgentOptions.scheduler,
            ...(options?.scheduler ?? {})
        },
        ui: {
            ...defaultAgentOptions.ui,
            ...(options?.ui ?? {})
        },
        model: {
            ...defaultAgentOptions.model,
            ...(options?.model ?? {})
        },
        bootstrapTurn: {
            ...defaultAgentOptions.bootstrapTurn,
            ...(options?.bootstrapTurn ?? {})
        }
    };
}

import { AgentModelOptions } from './model/ModelProviderOptions';

export interface AgentSessionOptions {
    summaryThreshold?: number;
    recentMessages?: number;
}

export interface AgentSchedulerOptions {
    enabled?: boolean;
}

export interface AgentUIOptions {
    title?: string;
}

export interface AgentOptions {
    name?: string;
    maxToolRounds?: number;
    session?: AgentSessionOptions;
    scheduler?: AgentSchedulerOptions;
    ui?: AgentUIOptions;
    model?: AgentModelOptions;
}

export const defaultAgentOptions: AgentOptions = {
    name: 'HermesAgent',
    maxToolRounds: 4,
    session: {
        summaryThreshold: 8,
        recentMessages: 6
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
        }
    };
}

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
    }
};

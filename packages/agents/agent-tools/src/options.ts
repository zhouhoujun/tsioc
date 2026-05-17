export interface WebSearchResult {
    title: string;
    url: string;
    snippet?: string;
}

export interface WebSearchAdapter {
    search(query: string, limit?: number): Promise<WebSearchResult[]>;
}

export interface AgentToolsFileOptions {
    rootDir?: string;
    maxReadBytes?: number;
    maxReadLines?: number;
    maxSearchResults?: number;
    defaultGlob?: string[];
    excludedGlobs?: string[];
}

export interface AgentToolsWebOptions {
    search?: WebSearchAdapter;
    fetch?: typeof fetch;
    timeoutMs?: number;
    maxContentChars?: number;
}

export interface AgentToolsTerminalOptions {
    defaultTimeoutMs?: number;
    maxTimeoutMs?: number;
}

export interface AgentToolsHttpOptions {
    fetch?: typeof fetch;
    timeoutMs?: number;
    maxResponseChars?: number;
}

export interface AgentToolsScheduleOptions {
    maxTasksPerSession?: number;
    maxPromptLength?: number;
    maxDelayMs?: number;
    minIntervalMs?: number;
    maxIntervalMs?: number;
}

export interface AgentToolsOptions {
    file?: AgentToolsFileOptions;
    web?: AgentToolsWebOptions;
    http?: AgentToolsHttpOptions;
    terminal?: AgentToolsTerminalOptions;
    schedule?: AgentToolsScheduleOptions;
}

export const defaultAgentToolsOptions: AgentToolsOptions = {
    file: {
        rootDir: process.cwd(),
        maxReadBytes: 32 * 1024,
        maxReadLines: 400,
        maxSearchResults: 50,
        defaultGlob: ['**/*'],
        excludedGlobs: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**']
    },
    web: {
        timeoutMs: 15000,
        maxContentChars: 12000
    },
    http: {
        timeoutMs: 15000,
        maxResponseChars: 12000
    }
};

export function mergeAgentToolsOptions(options?: AgentToolsOptions): AgentToolsOptions {
    return {
        file: {
            ...(defaultAgentToolsOptions.file ?? {}),
            ...(options?.file ?? {})
        },
        web: {
            ...(defaultAgentToolsOptions.web ?? {}),
            ...(options?.web ?? {})
        },
        http: {
            ...(defaultAgentToolsOptions.http ?? {}),
            ...(options?.http ?? {})
        },
        terminal: {
            ...(options?.terminal ?? {})
        },
        schedule: {
            ...(options?.schedule ?? {})
        }
    };
}

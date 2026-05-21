import { AgentMcpOptions } from '../mcp/types';

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

export interface AgentToolsProcessOptions {
    maxProcessesPerSession?: number;
    maxOutputChars?: number;
}

export interface AgentToolsHttpOptions {
    fetch?: typeof fetch;
    timeoutMs?: number;
    maxResponseChars?: number;
}

export interface AgentToolsPdfOptions {
    adapter?: import('../media').PdfReadAdapter;
}

export interface AgentToolsScheduleOptions {
    maxTasksPerSession?: number;
    maxPromptLength?: number;
    maxDelayMs?: number;
    minIntervalMs?: number;
    maxIntervalMs?: number;
}

export type AgentToolGroup =
    | 'filesystem'
    | 'filesystem_write'
    | 'utility'
    | 'web'
    | 'browser'
    | 'sessions'
    | 'planning'
    | 'process'
    | 'scheduling'
    | 'memory'
    | 'project'
    | 'registry'
    | 'http'
    | 'terminal'
    | 'media';

export type AgentToolItem =
    | 'read_file'
    | 'write_file'
    | 'edit_file'
    | 'glob_search'
    | 'content_search'
    | 'calculator'
    | 'web_search'
    | 'web_extract'
    | 'browser_open'
    | 'text_browser'
    | 'sessions_current'
    | 'sessions_list'
    | 'sessions_history'
    | 'todo'
    | 'ask_user'
    | 'escalate'
    | 'process.start'
    | 'process.poll'
    | 'process.kill'
    | 'schedule'
    | 'memory.list'
    | 'memory.put'
    | 'memory.search'
    | 'memory.recall'
    | 'memory.export'
    | 'memory.forget'
    | 'memory.purge'
    | 'memory.delete'
    | 'project_intel'
    | 'tool_search'
    | 'tool_inspect'
    | 'http_fetch'
    | 'http_request'
    | 'terminal'
    | 'image_info'
    | 'pdf_read';

export interface AgentToolsRegistrationOptions {
    preset?: 'default' | 'none' | 'all';
    groups?: Partial<Record<AgentToolGroup, boolean>>;
    items?: Partial<Record<AgentToolItem, boolean>>;
}

export interface AgentToolsOptions {
    file?: AgentToolsFileOptions;
    web?: AgentToolsWebOptions;
    http?: AgentToolsHttpOptions;
    terminal?: AgentToolsTerminalOptions;
    process?: AgentToolsProcessOptions;
    pdf?: AgentToolsPdfOptions;
    schedule?: AgentToolsScheduleOptions;
    roots?: string[];
    mcp?: AgentMcpOptions;
    registration?: AgentToolsRegistrationOptions;
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
    },
    registration: {
        preset: 'default',
        groups: {},
        items: {
            'memory.purge': false
        }
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
        process: {
            ...(options?.process ?? {})
        },
        pdf: {
            ...(options?.pdf ?? {})
        },
        schedule: {
            ...(options?.schedule ?? {})
        },
        roots: (options?.roots ?? []).slice(),
        mcp: options?.mcp ? {
            ...options.mcp,
            servers: (options.mcp.servers ?? []).slice(),
            clientInfo: options.mcp.clientInfo ? { ...options.mcp.clientInfo } : undefined
        } : undefined,
        registration: {
            ...(defaultAgentToolsOptions.registration ?? {}),
            ...(options?.registration ?? {}),
            groups: {
                ...(defaultAgentToolsOptions.registration?.groups ?? {}),
                ...(options?.registration?.groups ?? {})
            },
            items: {
                ...(defaultAgentToolsOptions.registration?.items ?? {}),
                ...(options?.registration?.items ?? {})
            }
        }
    };
}

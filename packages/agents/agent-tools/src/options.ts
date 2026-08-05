import { AgentMcpOptions } from '../mcp/types';
import { AgentAiCliOptions } from '../ai-cli/types';
import { AgentFormatterOptions } from '@tsdi/agent';

export { AgentFormatterOptions };

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

export interface AgentToolsBrowserOptions {
    adapter?: import('../browser/playwright-browser.tool').PlaywrightBrowserAdapter;
    defaultTimeoutMs?: number;
    maxExtractChars?: number;
}

export interface AgentToolsTerminalOptions {
    defaultTimeoutMs?: number;
    maxTimeoutMs?: number;
}

export interface AgentToolsSshOptions {
    /** Named SSH host configurations available to ssh_* tools. */
    hosts?: Record<string, import('@tsdi/agent-ssh').SshHostConfig>;
    /** Host ids (or host:port) allowed to be connected. Empty means all configured hosts are allowed. */
    allowlist?: string[];
    defaultTimeoutMs?: number;
    maxTimeoutMs?: number;
}

export interface AgentToolsSandboxOptions {
    enabled?: boolean;
    maxCommandLength?: number;
    allowedCommands?: string[];
    blockedCommands?: string[];
    inheritEnv?: boolean;
    allowedEnv?: string[];
    blockedEnv?: string[];
    /** OS-level sandbox mode for process tools ('off' | 'workspace' | 'network-block'). */
    mode?: import('@tsdi/agent').SandboxMode;
}

export interface AgentToolsCodeExecutionOptions {
    adapter?: import('../code-execution').CodeExecutionAdapter;
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

export interface AgentToolsCaptureOptions {
    screenshotAdapter?: import('../capture').ScreenshotAdapter;
    guiAdapter?: import('../capture').GuiControlAdapter;
}

export interface AgentToolsWeatherOptions {
    adapter?: import('../utility').WeatherAdapter;
    fetch?: typeof fetch;
    timeoutMs?: number;
    geocodingBaseUrl?: string;
    forecastBaseUrl?: string;
    userAgent?: string;
}

export interface AgentToolsLocationOptions {
    adapter?: import('../utility').LocationAdapter;
    fetch?: typeof fetch;
    timeoutMs?: number;
    lookupUrl?: string;
    userAgent?: string;
}

export interface AgentToolsScheduleOptions {
    maxTasksPerSession?: number;
    maxPromptLength?: number;
    maxDelayMs?: number;
    minIntervalMs?: number;
    maxIntervalMs?: number;
}

export interface AgentToolsCodingTaskOptions {
    parallelWorkerTimeoutMs?: number;
    parallelWorkerRetries?: number;
}

/**
 * Delegation worker model routing policy. Maps a worker class
 * (`spawn_agent`, `llm_task`, or custom) to a named model profile registered
 * on the agent's model options (`AgentModelOptions.profiles`). Delegation
 * workers pin that profile for their session instead of relying on
 * complexity/routes matching.
 */
export interface AgentToolsDelegationEncryptionOptions {
    /** Static AES-256-GCM key for delegation metadata at rest. Prefer keyEnv. */
    key?: string;
    /** Environment variable holding the AES-256-GCM delegation key. */
    keyEnv?: string;
}

export interface AgentToolsDelegationOptions {
    workerModelProfiles?: Record<string, string>;
    /**
     * Cap the number of concurrently running delegation workers within a
     * single spawn batch (spawn_agent / parallel_spawn / orchestrate phase).
     * Undefined keeps unlimited concurrency.
     */
    concurrency?: number;
    /**
     * When a key is configured, delegation metadata (goal/context) and
     * sub-agent secrets are sealed with AES-256-GCM before persistence.
     * Without a key, metadata stays plaintext (previous behavior).
     */
    encryption?: AgentToolsDelegationEncryptionOptions;
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
    | 'ssh'
    | 'media'
    | 'agent'
    | 'code_execution'
    | 'knowledge'
    | 'git'
    | 'communication'
    | 'audio'
    | 'security'
    | 'cron'
    | 'data'
    | 'llm'
    | 'capture'
    | 'canvas'
    | 'approval'
    | 'pipeline'
    | 'kanban'
    | 'backup'
    | 'model_routing'
    | 'poll'
    | 'lsp'
    | 'ai_cli';

export type AgentToolItem =
    | 'read_file'
    | 'write_file'
    | 'edit_file'
    | 'apply_patch'
    | 'mkdir'
    | 'copy_file'
    | 'move_file'
    | 'delete_file'
    | 'list_dir'
    | 'stat'
    | 'glob_search'
    | 'content_search'
    | 'watch_files'
    | 'calculator'
    | 'web_search'
    | 'web_extract'
    | 'browser_open'
    | 'text_browser'
    | 'playwright_browser'
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
    | 'coding_task'
    | 'tool_search'
    | 'tool_inspect'
    | 'http_fetch'
    | 'http_request'
    | 'terminal'
    | 'ssh_exec'
    | 'ssh_put'
    | 'ssh_get'
    | 'ssh_tunnel'
    | 'image_info'
    | 'pdf_read'
    | 'vision_analyze'
    | 'image_generate'
    | 'spawn_agent'
    | 'parallel_spawn'
    | 'orchestrate'
    | 'execute_code'
    | 'knowledge_search'
    | 'knowledge_store'
    | 'git_operations'
    | 'location'
    | 'weather'
    | 'session_search'
    | 'send_message'
    | 'audio_transcribe'
    | 'text_to_speech'
    | 'verifiable_intent'
    | 'security_scan'
    | 'cron_manage'
    | 'data_manage'
    | 'llm_task'
    | 'screenshot'
    | 'gui_control'
    | 'canvas'
    | 'approval'
    | 'checkpoint'
    | 'pipeline'
    | 'kanban'
    | 'backup'
    | 'model_routing'
    | 'poll'
    | 'lsp_definition'
    | 'lsp_references'
    | 'lsp_diagnostics'
    | 'lsp_symbols'
    | 'ai_cli';

export interface AgentToolsRegistrationOptions {
    preset?: 'default' | 'none' | 'all';
    groups?: Partial<Record<AgentToolGroup, boolean>>;
    items?: Partial<Record<AgentToolItem, boolean>>;
}

export interface AgentToolsLspOptions {
    /** File-extension ('.ts', '.py', ...) to LSP server launch options. */
    servers?: Record<string, import('../lsp/types').LspServerOptions>;
    timeoutMs?: number;
}

export interface AgentToolsOptions {
    file?: AgentToolsFileOptions;
    web?: AgentToolsWebOptions;
    browser?: AgentToolsBrowserOptions;
    http?: AgentToolsHttpOptions;
    terminal?: AgentToolsTerminalOptions;
    ssh?: AgentToolsSshOptions;
    process?: AgentToolsProcessOptions;
    sandbox?: AgentToolsSandboxOptions;
    codeExecution?: AgentToolsCodeExecutionOptions;
    aiCli?: AgentAiCliOptions;
    pdf?: AgentToolsPdfOptions;
    capture?: AgentToolsCaptureOptions;
    location?: AgentToolsLocationOptions;
    weather?: AgentToolsWeatherOptions;
    schedule?: AgentToolsScheduleOptions;
    codingTask?: AgentToolsCodingTaskOptions;
    delegation?: AgentToolsDelegationOptions;
    roots?: string[];
    /** A7: best-effort source formatter run by write tools on matching extensions. */
    format?: AgentFormatterOptions;
    mcp?: AgentMcpOptions;
    lsp?: AgentToolsLspOptions;
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
    browser: {
        defaultTimeoutMs: 15000,
        maxExtractChars: 12000
    },
    http: {
        timeoutMs: 15000,
        maxResponseChars: 12000
    },
    location: {
        timeoutMs: 15000,
        lookupUrl: 'https://ipinfo.io/json',
        userAgent: 'tsdi-agent/6'
    },
    sandbox: {
        enabled: true,
        maxCommandLength: 4000,
        inheritEnv: true,
        blockedEnv: []
    },
    weather: {
        timeoutMs: 15000,
        geocodingBaseUrl: 'https://geocoding-api.open-meteo.com/v1',
        forecastBaseUrl: 'https://api.open-meteo.com/v1',
        userAgent: 'tsdi-agent/6'
    },
    codingTask: {
        parallelWorkerTimeoutMs: 30000,
        parallelWorkerRetries: 1
    },
    delegation: {},
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
        browser: {
            ...(defaultAgentToolsOptions.browser ?? {}),
            ...(options?.browser ?? {})
        },
        http: {
            ...(defaultAgentToolsOptions.http ?? {}),
            ...(options?.http ?? {})
        },
        location: {
            ...(defaultAgentToolsOptions.location ?? {}),
            ...(options?.location ?? {})
        },
        weather: {
            ...(defaultAgentToolsOptions.weather ?? {}),
            ...(options?.weather ?? {})
        },
        terminal: {
            ...(options?.terminal ?? {})
        },
        ssh: {
            ...(options?.ssh ?? {})
        },
        process: {
            ...(options?.process ?? {})
        },
        codeExecution: {
            ...(options?.codeExecution ?? {})
        },
        sandbox: {
            ...(defaultAgentToolsOptions.sandbox ?? {}),
            ...(options?.sandbox ?? {})
        },
        aiCli: {
            ...(options?.aiCli ?? {})
        },
        pdf: {
            ...(options?.pdf ?? {})
        },
        capture: {
            ...(options?.capture ?? {})
        },
        schedule: {
            ...(options?.schedule ?? {})
        },
        codingTask: {
            ...(defaultAgentToolsOptions.codingTask ?? {}),
            ...(options?.codingTask ?? {})
        },
        delegation: {
            ...(defaultAgentToolsOptions.delegation ?? {}),
            ...(options?.delegation ?? {}),
            workerModelProfiles: {
                ...(defaultAgentToolsOptions.delegation?.workerModelProfiles ?? {}),
                ...(options?.delegation?.workerModelProfiles ?? {})
            }
        },
        roots: (options?.roots ?? []).slice(),
        format: options?.format
            ? { ...options.format, extensions: options.format.extensions.slice() }
            : undefined,
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

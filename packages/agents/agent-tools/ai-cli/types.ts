export type AiCliName = 'claude_code' | 'opencode' | 'gemini_cli' | 'codex_cli';

export interface AiCliRequest {
    prompt: string;
    cli: AiCliName;
    workingDirectory?: string;
    timeoutMs?: number;
    systemPrompt?: string;
    model?: string;
    allowedTools?: string[];
    resumeSessionId?: string;
    maxTurns?: number;
    skipPermissions?: boolean;
    outputFormat?: 'text' | 'json';
    env?: Record<string, string>;
    contextFiles?: string[];
}

export interface AiCliResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    sessionId?: string;
    timedOut?: boolean;
}

export interface AiCliAdapter {
    execute(request: AiCliRequest): Promise<AiCliResult>;
}

export const AGENT_AI_CLI_ADAPTER = 'AGENT_AI_CLI_ADAPTER';

export interface AgentAiCliOptions {
    /** Default model to pass to the spawned CLI */
    defaultModel?: string;
    /** Environment variables to forward to subprocesses */
    forwardEnv?: string[];
    /** Whether to auto-discover CLAUDE.md / AGENTS.md in the working directory */
    autoContextFiles?: boolean;
    /** Default timeout in ms */
    defaultTimeoutMs?: number;
}

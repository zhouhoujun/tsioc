export type AiCliName = 'claude_code' | 'opencode' | 'gemini_cli' | 'codex_cli';

export interface AiCliRequest {
    prompt: string;
    cli: AiCliName;
    workingDirectory?: string;
    timeoutMs?: number;
    systemPrompt?: string;
    allowedTools?: string[];
    resumeSessionId?: string;
    outputFormat?: 'text' | 'json';
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

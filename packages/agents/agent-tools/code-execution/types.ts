export interface CodeExecutionAdapter {
    execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
}

export interface CodeExecutionRequest {
    language: string;
    code: string;
    timeoutMs?: number;
}

export interface CodeExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    error?: string;
}

export const AGENT_CODE_EXECUTION_ADAPTER = 'AGENT_CODE_EXECUTION_ADAPTER';

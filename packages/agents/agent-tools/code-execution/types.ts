import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class CodeExecutionAdapter {
    abstract execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
}

export interface CodeExecutionRequest {
    language: string;
    code: string;
    timeoutMs?: number;
    workspace?: string;
    workdir?: string;
    /**
     * Aborted when the owning turn is cancelled (user interrupt) so the run
     * stops promptly instead of waiting out its timeout. Adapters should stop
     * the execution and reject with the cancellation error.
     */
    signal?: AbortSignal;
}

export interface CodeExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    error?: string;
    cwd?: string;
    workspace?: string;
}

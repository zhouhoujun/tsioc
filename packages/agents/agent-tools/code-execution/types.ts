import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class CodeExecutionAdapter {
    abstract execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
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

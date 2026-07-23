import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { CodeExecutionAdapter } from './types';

@Injectable()
export class ExecuteCodeTool implements AgentTool {
    name = 'execute_code';
    description = 'Execute code in a sandboxed environment. Supports Python and shell-style runtimes by default; other languages depend on the configured execution backend.';
    inputSchema = {
        type: 'object',
        properties: {
            language: {
                type: 'string',
                description: 'Programming language (python, python3, py, bash, sh, typescript, ts, node, js, etc.).'
            },
            code: {
                type: 'string',
                description: 'Source code to execute.'
            },
            workdir: {
                type: 'string',
                description: 'Optional working directory relative to the current workspace.'
            },
            timeoutMs: {
                type: 'number',
                description: 'Execution timeout in milliseconds (default: 30000).'
            }
        },
        required: ['language', 'code']
    };
    toolset = 'code_execution';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        private adapter: CodeExecutionAdapter
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const language = this.requireString(input?.language, 'execute_code language');
        const code = this.requireString(input?.code, 'execute_code code');
        const result = await this.adapter.execute({
            language: language.toLowerCase(),
            code,
            timeoutMs: typeof input?.timeoutMs === 'number' && input.timeoutMs > 0 ? input.timeoutMs : 30000,
            workspace: context.workspace,
            workdir: typeof input?.workdir === 'string' ? input.workdir : undefined
        });
        return {
            language,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            error: result.error,
            cwd: result.cwd,
            workspace: result.workspace
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}

import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { CodeExecutionAdapter } from './types';

@Injectable()
export class ExecuteCodeTool implements AgentTool {
    name = 'execute_code';
    description = 'Execute code in a sandboxed environment. Supports Python, JavaScript, TypeScript, Go, Rust, and other languages depending on the configured execution backend.';
    inputSchema = {
        type: 'object',
        properties: {
            language: {
                type: 'string',
                description: 'Programming language (python, javascript, typescript, go, rust, bash, etc.).'
            },
            code: {
                type: 'string',
                description: 'Source code to execute.'
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
        @Optional() @Inject(CodeExecutionAdapter)
        private adapter?: CodeExecutionAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const language = this.requireString(input?.language, 'execute_code language');
        const code = this.requireString(input?.code, 'execute_code code');
        if (!this.adapter) {
            throw new Error('execute_code requires a configured CodeExecutionAdapter. Provide one via the AGENT_CODE_EXECUTION_ADAPTER token.');
        }
        const result = await this.adapter.execute({
            language: language.toLowerCase(),
            code,
            timeoutMs: typeof input?.timeoutMs === 'number' && input.timeoutMs > 0 ? input.timeoutMs : 30000
        });
        return {
            language,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            error: result.error
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}

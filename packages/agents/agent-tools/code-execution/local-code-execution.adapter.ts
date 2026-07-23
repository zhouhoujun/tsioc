import { spawn } from 'child_process';
import { Injectable } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { assertSandboxCommand, buildSandboxEnv, resolveSandboxPolicy } from '../src/sandbox-policy';
import { CodeExecutionAdapter, CodeExecutionRequest, CodeExecutionResult } from './types';

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_OUTPUT_CHARS = 256 * 1024;

interface RuntimeSpec {
    command: string;
    baseArgs: string[];
}

@Injectable()
export class LocalCodeExecutionAdapter extends CodeExecutionAdapter {
    constructor(private options?: AgentToolsOptions) {
        super();
    }

    async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
        const runtime = await this.resolveRuntime(request.language);
        const policy = resolveSandboxPolicy(this.options);
        const commandLine = [runtime.command, ...runtime.baseArgs].join(' ').trim();
        assertSandboxCommand(commandLine, policy, 'execute_code');

        const timeoutMs = typeof request.timeoutMs === 'number' && request.timeoutMs > 0 ? request.timeoutMs : DEFAULT_TIMEOUT_MS;
        const workingDirectory = this.options?.file?.rootDir ?? process.cwd();
        const env = buildSandboxEnv(process.env, policy);
        const spawnArgs = [...runtime.baseArgs, request.code];
        return this.run(commandLine, runtime.command, spawnArgs, workingDirectory, env, timeoutMs);
    }

    private async resolveRuntime(language: string): Promise<RuntimeSpec> {
        const normalized = language.trim().toLowerCase();
        switch (normalized) {
            case 'python':
            case 'python3':
            case 'py':
                return {
                    command: 'python3',
                    baseArgs: ['-c']
                };
            case 'bash':
            case 'sh':
                return {
                    command: 'bash',
                    baseArgs: ['-lc']
                };
            default:
                throw new Error(`Unsupported execute_code language '${language}'. Supported languages: python, bash.`);
        }
    }

    private async run(
        commandLine: string,
        command: string,
        args: string[],
        cwd: string,
        env: NodeJS.ProcessEnv,
        timeoutMs: number
    ): Promise<CodeExecutionResult> {
        return new Promise((resolve) => {
            const child = spawn(command, args, {
                cwd,
                env,
                shell: false,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let settled = false;
            const finish = (result: CodeExecutionResult) => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve({
                    stdout: result.stdout.slice(-MAX_OUTPUT_CHARS),
                    stderr: result.stderr.slice(-MAX_OUTPUT_CHARS),
                    exitCode: result.exitCode,
                    error: result.error
                });
            };

            const timer = setTimeout(() => {
                child.kill('SIGTERM');
                stderr += stderr ? `\nexecute_code command timed out after ${timeoutMs} ms.` : `execute_code command timed out after ${timeoutMs} ms.`;
                finish({
                    stdout: '',
                    stderr,
                    exitCode: 124,
                    error: `Timed out after ${timeoutMs} ms.`
                });
            }, timeoutMs);

            child.stdout?.on('data', (chunk: Buffer) => {
                stdout += chunk.toString();
            });
            child.stderr?.on('data', (chunk: Buffer) => {
                stderr += chunk.toString();
            });
            child.on('error', (err) => {
                clearTimeout(timer);
                const message = (err as any).code === 'ENOENT'
                    ? `${command} is not available in PATH for ${commandLine}.`
                    : err.message;
                stderr += stderr ? `\n${message}` : message;
                finish({
                    stdout: '',
                    stderr,
                    exitCode: 1,
                    error: message
                });
            });
            child.on('close', (code) => {
                clearTimeout(timer);
                const trimmedStdout = stdout.trimEnd();
                const trimmedStderr = stderr.trimEnd();
                const exitCode = code ?? 0;
                finish({
                    stdout: trimmedStdout.slice(-MAX_OUTPUT_CHARS),
                    stderr: trimmedStderr.slice(-MAX_OUTPUT_CHARS),
                    exitCode,
                    error: exitCode === 0 ? undefined : (trimmedStderr || `execute_code exited with code ${exitCode}.`)
                });
            });
        });
    }
}

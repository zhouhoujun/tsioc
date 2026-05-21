import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { spawn } from 'child_process';
import { AiCliAdapter, AiCliName, AiCliRequest, AiCliResult, AGENT_AI_CLI_ADAPTER } from './types';

const CLI_COMMANDS: Record<AiCliName, { cmd: string; args: string[] }> = {
    claude_code: { cmd: 'claude', args: ['-p'] },
    opencode: { cmd: 'opencode', args: ['run'] },
    gemini_cli: { cmd: 'gemini', args: ['-p'] },
    codex_cli: { cmd: 'codex', args: ['-q'] }
};

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_CHARS = 512 * 1024;

@Injectable()
export class AiCliTool implements AgentTool {
    name = 'ai_cli';
    description = 'Call an external AI coding CLI tool (Claude Code, OpenCode, Gemini CLI, or Codex CLI) with a prompt and return the result. Supports working directory, timeout, and optional system prompts.';
    inputSchema = {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'The prompt or task description to send to the AI CLI.'
            },
            cli: {
                type: 'string',
                enum: ['claude_code', 'opencode', 'gemini_cli', 'codex_cli'],
                description: 'Which AI CLI to use.'
            },
            working_directory: {
                type: 'string',
                description: 'Working directory for the CLI (default: workspace root).'
            },
            timeout_ms: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 120000).'
            },
            system_prompt: {
                type: 'string',
                description: 'Optional system prompt to append (supported by Claude Code).'
            },
            resume_session_id: {
                type: 'string',
                description: 'Resume a previous session (supported by Claude Code).'
            }
        },
        required: ['prompt', 'cli']
    };
    toolset = 'ai_cli';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(AGENT_AI_CLI_ADAPTER, { defaultValue: null })
        private adapter?: AiCliAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const prompt = this.requireString(input?.prompt, 'ai_cli prompt');
        const cli = this.requireCli(input?.cli);

        const request: AiCliRequest = {
            prompt,
            cli,
            workingDirectory: typeof input?.working_directory === 'string' ? input.working_directory : undefined,
            timeoutMs: typeof input?.timeout_ms === 'number' ? input.timeout_ms : undefined,
            systemPrompt: typeof input?.system_prompt === 'string' ? input.system_prompt : undefined,
            resumeSessionId: typeof input?.resume_session_id === 'string' ? input.resume_session_id : undefined
        };

        let result: AiCliResult;

        if (this.adapter) {
            result = await this.adapter.execute(request);
        } else {
            result = await this.executeSubprocess(request, cli);
        }

        return {
            cli: result.sessionId ? `${cli} (session: ${result.sessionId})` : cli,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            sessionId: result.sessionId,
            timedOut: result.timedOut
        };
    }

    private async executeSubprocess(request: AiCliRequest, cli: AiCliName): Promise<AiCliResult> {
        const config = CLI_COMMANDS[cli];
        const timeout = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const args = [...config.args];
        if (request.systemPrompt) {
            args.push('--append-system-prompt', request.systemPrompt);
        }
        if (request.resumeSessionId) {
            args.push('--resume', request.resumeSessionId);
        }
        args.push(request.prompt);

        return new Promise((resolve) => {
            const child = spawn(config.cmd, args, {
                cwd: request.workingDirectory || undefined,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: process.env,
                shell: false
            });

            let stdout = '';
            let stderr = '';
            const timer = setTimeout(() => {
                child.kill('SIGTERM');
                resolve({
                    stdout: stdout.slice(-MAX_OUTPUT_CHARS),
                    stderr: stderr.slice(-MAX_OUTPUT_CHARS),
                    exitCode: 124,
                    timedOut: true
                });
            }, timeout);

            child.stdout?.on('data', (chunk: Buffer) => {
                stdout += chunk.toString();
            });
            child.stderr?.on('data', (chunk: Buffer) => {
                stderr += chunk.toString();
            });
            child.on('close', (code) => {
                clearTimeout(timer);
                let sessionId: string | undefined;
                try {
                    const json = JSON.parse(stdout);
                    if (json.session_id) {
                        sessionId = json.session_id;
                    }
                    if (json.result) {
                        stdout = json.result;
                    }
                } catch {
                    // not JSON output; use raw stdout
                }
                resolve({
                    stdout: stdout.slice(-MAX_OUTPUT_CHARS),
                    stderr: stderr.slice(-MAX_OUTPUT_CHARS),
                    exitCode: code ?? 1,
                    sessionId
                });
            });
            child.on('error', (err) => {
                clearTimeout(timer);
                const message = (err as any).code === 'ENOENT'
                    ? `'${config.cmd}' not found in PATH. Install it and ensure it is available.`
                    : err.message;
                resolve({ stdout: '', stderr: message, exitCode: 1 });
            });
        });
    }

    private requireCli(value: unknown): AiCliName {
        const valid = ['claude_code', 'opencode', 'gemini_cli', 'codex_cli'];
        if (typeof value !== 'string' || !valid.includes(value)) {
            throw new Error(`Invalid ai_cli cli: must be one of ${valid.join(', ')}.`);
        }
        return value as AiCliName;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}

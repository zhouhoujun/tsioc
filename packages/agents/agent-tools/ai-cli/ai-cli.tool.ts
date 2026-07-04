import * as fs from 'fs';
import * as path from 'path';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { spawn } from 'child_process';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { AiCliAdapter, AiCliName, AiCliRequest, AiCliResult, AgentAiCliOptions } from './types';

const CLI_COMMANDS: Record<AiCliName, { cmd: string; args: string[]; jsonFlag: string; modelFlag: string; toolsFlag: string; sessionFlag: string; systemPromptFlag: string; maxTurnsFlag: string; skipPermsFlag: string }> = {
    claude_code: {
        cmd: 'claude', args: ['-p'],
        jsonFlag: '--output-format', modelFlag: '--model',
        toolsFlag: '--allowedTools', sessionFlag: '--resume',
        systemPromptFlag: '--append-system-prompt',
        maxTurnsFlag: '--max-turns', skipPermsFlag: '--dangerously-skip-permissions'
    },
    opencode: {
        cmd: 'opencode', args: ['run'],
        jsonFlag: '--format', modelFlag: '--model',
        toolsFlag: '--allowed-tools', sessionFlag: '--session',
        systemPromptFlag: '--system-prompt',
        maxTurnsFlag: '--max-turns', skipPermsFlag: '--yes'
    },
    gemini_cli: {
        cmd: 'gemini', args: ['-p'],
        jsonFlag: '--output-format', modelFlag: '--model',
        toolsFlag: '', sessionFlag: '--resume',
        systemPromptFlag: '--system-prompt',
        maxTurnsFlag: '', skipPermsFlag: ''
    },
    codex_cli: {
        cmd: 'codex', args: ['-q'],
        jsonFlag: '--output-format', modelFlag: '--model',
        toolsFlag: '', sessionFlag: '--resume',
        systemPromptFlag: '--instructions',
        maxTurnsFlag: '', skipPermsFlag: ''
    }
};

const CONTEXT_FILE_NAMES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules', '.clinerules', '.windsurfrules'];
const DEFAULT_TIMEOUT_MS = 300_000;
const MAX_OUTPUT_CHARS = 512 * 1024;

const API_KEY_ENV_MAP: Record<string, string[]> = {
    claude_code: ['ANTHROPIC_API_KEY'],
    opencode: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY'],
    gemini_cli: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
    codex_cli: ['OPENAI_API_KEY']
};

@Injectable()
export class AiCliTool implements AgentTool {
    name = 'ai_cli';
    description = 'Call an external AI coding CLI tool (Claude Code, OpenCode, Gemini CLI, or Codex CLI) with a prompt. Supports JSON output, session resume, model override, allowed-tool restriction, project-context injection, and API key forwarding.';
    inputSchema = {
        type: 'object',
        properties: {
            prompt: { type: 'string', description: 'The prompt or task description to send to the AI CLI.' },
            cli: {
                type: 'string',
                enum: ['claude_code', 'opencode', 'gemini_cli', 'codex_cli'],
                description: 'Which AI CLI to use.'
            },
            working_directory: { type: 'string', description: 'Working directory (default: workspace root).' },
            timeout_ms: { type: 'number', description: 'Timeout in milliseconds (default: 300000).' },
            system_prompt: { type: 'string', description: 'Optional system prompt to append.' },
            model: { type: 'string', description: 'Model override passed to the CLI.' },
            allowed_tools: {
                type: 'array', items: { type: 'string' },
                description: 'Restrict which tools the spawned CLI may use (supported by Claude Code, OpenCode).'
            },
            resume_session_id: { type: 'string', description: 'Resume a previous session by ID.' },
            max_turns: { type: 'number', description: 'Maximum tool-calling turns (supported by Claude Code, OpenCode).' },
            skip_permissions: { type: 'boolean', description: 'Skip permission prompts (supported by Claude Code, OpenCode).' },
            output_format: { type: 'string', enum: ['text', 'json'], description: 'Output format (default: json for structured results).' },
            context_files: { type: 'boolean', description: 'Auto-discover and pass CLAUDE.md / AGENTS.md content to the CLI (default: true).' }
        },
        required: ['prompt', 'cli']
    };
    toolset = 'ai_cli';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(AiCliAdapter)
        private adapter?: AiCliAdapter | null,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private toolsOptions?: AgentToolsOptions | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const prompt = this.requireString(input?.prompt, 'ai_cli prompt');
        const cli = this.requireCli(input?.cli);

        const aiCliOpts = (this.toolsOptions as any)?.aiCli as AgentAiCliOptions | undefined;
        const workspaceRoot = this.toolsOptions?.file?.rootDir;

        const request: AiCliRequest = {
            prompt,
            cli,
            workingDirectory: typeof input?.working_directory === 'string'
                ? input.working_directory
                : workspaceRoot,
            timeoutMs: typeof input?.timeout_ms === 'number'
                ? input.timeout_ms
                : aiCliOpts?.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
            systemPrompt: typeof input?.system_prompt === 'string' ? input.system_prompt : undefined,
            model: typeof input?.model === 'string'
                ? input.model
                : aiCliOpts?.defaultModel,
            allowedTools: Array.isArray(input?.allowed_tools) ? input.allowed_tools : undefined,
            resumeSessionId: typeof input?.resume_session_id === 'string' ? input.resume_session_id : undefined,
            maxTurns: typeof input?.max_turns === 'number' ? input.max_turns : undefined,
            skipPermissions: typeof input?.skip_permissions === 'boolean' ? input.skip_permissions : undefined,
            outputFormat: typeof input?.output_format === 'string' && (input.output_format === 'text' || input.output_format === 'json')
                ? input.output_format
                : 'json',
            env: this.resolveEnv(cli, aiCliOpts)
        };

        const includeContext = input?.context_files !== false && (aiCliOpts?.autoContextFiles ?? true);
        if (includeContext && request.workingDirectory) {
            request.contextFiles = this.discoverContextFiles(request.workingDirectory);
        }

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
        const args = this.buildArgs(request, config);

        const env = { ...process.env, ...(request.env ?? {}) };

        return new Promise((resolve) => {
            const child = spawn(config.cmd, args, {
                cwd: request.workingDirectory || undefined,
                stdio: ['pipe', 'pipe', 'pipe'],
                env,
                shell: false
            });

            // Inject context files via stdin as a prepended instruction
            if (request.contextFiles?.length) {
                const contextBlock = `<system-reminder>\n${request.contextFiles.join('\n\n')}\n</system-reminder>\n`;
                child.stdin?.write(contextBlock);
            }

            // Write prompt to stdin for tools that prefer stdin input
            if (cli === 'opencode') {
                child.stdin?.write(request.prompt + '\n');
                child.stdin?.end();
            } else {
                child.stdin?.end();
            }

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
                const parsed = this.parseCliOutput(stdout, request.outputFormat ?? 'json');
                resolve({
                    stdout: parsed.stdout.slice(-MAX_OUTPUT_CHARS),
                    stderr: parsed.stderr || stderr.slice(-MAX_OUTPUT_CHARS),
                    exitCode: code ?? parsed.exitCode,
                    sessionId: parsed.sessionId
                });
            });
            child.on('error', (err) => {
                clearTimeout(timer);
                const message = (err as any).code === 'ENOENT'
                    ? `'${config.cmd}' not found in PATH. Install it (e.g., 'npm i -g @anthropic-ai/claude-code' for Claude Code, or 'npm i -g opencode' for OpenCode) and ensure it is available in the PATH.`
                    : err.message;
                resolve({ stdout: '', stderr: message, exitCode: 1 });
            });
        });
    }

    private buildArgs(request: AiCliRequest, config: typeof CLI_COMMANDS[AiCliName]): string[] {
        const args = [...config.args];

        // Output format (JSON by default for structured parsing)
        if (request.outputFormat === 'json' && config.jsonFlag) {
            args.push(config.jsonFlag, 'json');
        }

        // Model override
        if (request.model && config.modelFlag) {
            args.push(config.modelFlag, request.model);
        }

        // System prompt
        if (request.systemPrompt && config.systemPromptFlag) {
            args.push(config.systemPromptFlag, request.systemPrompt);
        }

        // Allowed tools
        if (request.allowedTools?.length && config.toolsFlag) {
            args.push(config.toolsFlag, request.allowedTools.join(','));
        }

        // Session resume
        if (request.resumeSessionId && config.sessionFlag) {
            args.push(config.sessionFlag, request.resumeSessionId);
        }

        // Max turns
        if (request.maxTurns != null && config.maxTurnsFlag) {
            args.push(config.maxTurnsFlag, String(request.maxTurns));
        }

        // Skip permissions
        if (request.skipPermissions && config.skipPermsFlag) {
            args.push(config.skipPermsFlag);
        }

        // Prompt (positional last arg for most CLIs)
        if (request.cli !== 'opencode') {
            args.push(request.prompt);
        }

        return args;
    }

    private parseCliOutput(stdout: string, outputFormat: 'text' | 'json'): { stdout: string; stderr?: string; exitCode: number; sessionId?: string } {
        if (outputFormat === 'json') {
            try {
                const json = JSON.parse(stdout);
                return {
                    stdout: json.result ?? json.content ?? json.text ?? stdout,
                    stderr: json.stderr,
                    exitCode: json.exitCode ?? json.exit_code ?? 0,
                    sessionId: json.session_id ?? json.sessionId ?? json.uuid
                };
            } catch {
                // Not valid JSON — return raw stdout
            }
        }
        return { stdout, exitCode: 0 };
    }

    private resolveEnv(cli: AiCliName, opts?: AgentAiCliOptions): Record<string, string> {
        const env: Record<string, string> = {};

        // Forward API keys relevant to the CLI
        const keyNames = API_KEY_ENV_MAP[cli] ?? [];
        for (const key of keyNames) {
            if (process.env[key]) {
                env[key] = process.env[key]!;
            }
        }

        // Forward explicitly configured env vars
        if (opts?.forwardEnv) {
            for (const key of opts.forwardEnv) {
                if (process.env[key] && !env[key]) {
                    env[key] = process.env[key]!;
                }
            }
        }

        return env;
    }

    private discoverContextFiles(workingDirectory: string): string[] {
        const contents: string[] = [];
        for (const name of CONTEXT_FILE_NAMES) {
            const filePath = path.join(workingDirectory, name);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    contents.push(content);
                } catch {
                    // Ignore unreadable files
                }
            }
        }
        return contents;
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

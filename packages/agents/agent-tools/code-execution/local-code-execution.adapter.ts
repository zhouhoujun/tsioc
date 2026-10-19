import * as fs from 'fs/promises';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { Injectable } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { CANCELLED_MESSAGE, runChildProcess } from '@tsdi/agent';
import { assertSandboxCommand, buildSandboxEnv, resolveSandboxPolicy } from '../src/sandbox-policy';
import { resolveWorkspacePath } from '../files/path-policy';
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
        const policy = resolveSandboxPolicy(this.options);
        const timeoutMs = typeof request.timeoutMs === 'number' && request.timeoutMs > 0 ? request.timeoutMs : DEFAULT_TIMEOUT_MS;
        const { cwd, workspace } = await this.resolveWorkingDirectory(request);
        const normalized = request.language.trim().toLowerCase();
        if (this.isJavaScriptLanguage(normalized) || this.isTypeScriptLanguage(normalized)) {
            assertSandboxCommand('node', policy, 'execute_code');
            const code = this.isTypeScriptLanguage(normalized) ? this.transpileTypeScript(request.code) : request.code;
            const env = buildSandboxEnv(process.env, policy);
            return this.runScriptInWorker(code, cwd, workspace, env, timeoutMs, request.signal);
        }

        const runtime = await this.resolveRuntime(normalized);
        const commandLine = [runtime.command, ...runtime.baseArgs].join(' ').trim();
        assertSandboxCommand(commandLine, policy, 'execute_code');
        const env = buildSandboxEnv(process.env, policy);
        const spawnArgs = [...runtime.baseArgs, request.code];
        return this.run(commandLine, runtime.command, spawnArgs, cwd, workspace, env, timeoutMs, request.signal);
    }

    private async resolveRuntime(language: string): Promise<RuntimeSpec> {
        switch (language) {
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
                throw new Error(`Unsupported execute_code language '${language}'. Supported languages: python, bash, node, typescript.`);
        }
    }

    private isJavaScriptLanguage(language: string): boolean {
        return language === 'node' || language === 'nodejs' || language === 'javascript' || language === 'js';
    }

    private isTypeScriptLanguage(language: string): boolean {
        return language === 'typescript' || language === 'ts' || language === 'tsx';
    }

    private transpileTypeScript(code: string): string {
        try {
            const ts = require('typescript');
            const output = ts.transpileModule(code, {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2020,
                    esModuleInterop: true,
                    jsx: ts.JsxEmit.React
                },
                reportDiagnostics: true
            });
            const diagnostic = output.diagnostics?.find((item: any) => item.category === ts.DiagnosticCategory.Error);
            if (diagnostic) {
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                throw new Error(message);
            }
            return output.outputText;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to transpile TypeScript for execute_code: ${message}`);
        }
    }

    private async resolveWorkingDirectory(request: CodeExecutionRequest): Promise<{ cwd: string; workspace: string; }> {
        const workspaceRoot = String(request.workspace || this.options?.file?.rootDir || process.cwd()).trim() || process.cwd();
        const workdir = String(request.workdir || '').trim();
        const cwd = workdir ? resolveWorkspacePath(workdir, workspaceRoot) : path.resolve(workspaceRoot);
        const stat = await fs.stat(cwd);
        if (!stat.isDirectory()) {
            throw new Error(`execute_code working directory '${cwd}' is not a directory.`);
        }
        return {
            cwd,
            workspace: path.resolve(workspaceRoot)
        };
    }

    private async run(
        commandLine: string,
        command: string,
        args: string[],
        cwd: string,
        workspace: string,
        env: NodeJS.ProcessEnv,
        timeoutMs: number,
        signal?: AbortSignal
    ): Promise<CodeExecutionResult> {
        const outcome = await runChildProcess({
            command,
            args,
            cwd,
            env,
            shell: false,
            stdin: '',
            timeoutMs,
            signal
        });
        switch (outcome.kind) {
            case 'cancelled':
                throw new Error(CANCELLED_MESSAGE);
            case 'timeout': {
                const note = `execute_code command timed out after ${timeoutMs} ms.`;
                return this.result(cwd, workspace, {
                    stdout: '',
                    stderr: outcome.stderr ? `${outcome.stderr}\n${note}` : note,
                    exitCode: 124,
                    error: `Timed out after ${timeoutMs} ms.`
                });
            }
            case 'error': {
                const message = outcome.error.code === 'ENOENT'
                    ? `${command} is not available in PATH for ${commandLine}.`
                    : outcome.error.message;
                return this.result(cwd, workspace, {
                    stdout: '',
                    stderr: outcome.stderr ? `${outcome.stderr}\n${message}` : message,
                    exitCode: 1,
                    error: message
                });
            }
            default: {
                const trimmedStdout = outcome.stdout.trimEnd();
                const trimmedStderr = outcome.stderr.trimEnd();
                const exitCode = outcome.exitCode ?? 0;
                return this.result(cwd, workspace, {
                    stdout: trimmedStdout,
                    stderr: trimmedStderr,
                    exitCode,
                    error: exitCode === 0 ? undefined : (trimmedStderr || `execute_code exited with code ${exitCode}.`)
                });
            }
        }
    }

    /** Mirrors the result shaping (tail-capped output) of every run path. */
    private result(cwd: string, workspace: string, result: Partial<CodeExecutionResult> & { exitCode: number }): CodeExecutionResult {
        return {
            stdout: (result.stdout ?? '').slice(-MAX_OUTPUT_CHARS),
            stderr: (result.stderr ?? '').slice(-MAX_OUTPUT_CHARS),
            exitCode: result.exitCode,
            error: result.error,
            cwd,
            workspace
        };
    }

    private async runScriptInWorker(
        code: string,
        cwd: string,
        workspace: string,
        env: NodeJS.ProcessEnv,
        timeoutMs: number,
        signal?: AbortSignal
    ): Promise<CodeExecutionResult> {
        // A turn cancelled before the run started must not start the worker.
        if (signal?.aborted) {
            throw new Error(CANCELLED_MESSAGE);
        }
        return new Promise((resolve, reject) => {
            const workerSource = this.createWorkerSource();
            const worker = new Worker(workerSource, {
                eval: true,
                workerData: {
                    code,
                    cwd,
                    workspace,
                    env
                }
            });
            let settled = false;
            const cleanup = () => {
                clearTimeout(timer);
                signal?.removeEventListener('abort', onAbort);
            };
            const finish = (result: CodeExecutionResult) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                resolve(this.result(cwd, workspace, result));
            };
            const fail = (error: Error) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(error);
            };
            /**
             * User interrupt (Esc): settle with a cancellation error first, then
             * stop the worker. Settling first matters because
             * `worker.terminate()` only resolves after the worker's 'exit'
             * event, which must not be reported as a normal result.
             */
            const onAbort = () => {
                fail(new Error(CANCELLED_MESSAGE));
                void worker.terminate();
            };
            const timer = setTimeout(async () => {
                const stderr = `execute_code command timed out after ${timeoutMs} ms.`;
                await worker.terminate();
                finish({
                    stdout: '',
                    stderr,
                    exitCode: 124,
                    error: `Timed out after ${timeoutMs} ms.`,
                    cwd,
                    workspace
                });
            }, timeoutMs);
            signal?.addEventListener('abort', onAbort, { once: true });
            // The signal can fire between the pre-check and this registration;
            // without this the interrupt would be lost.
            if (signal?.aborted) {
                onAbort();
            }
            worker.on('message', (message: any) => {
                finish({
                    stdout: String(message?.stdout ?? ''),
                    stderr: String(message?.stderr ?? ''),
                    exitCode: Number.isFinite(message?.exitCode) ? Number(message.exitCode) : 0,
                    error: message?.error ? String(message.error) : undefined,
                    cwd,
                    workspace
                });
            });
            worker.on('error', async (error) => {
                await worker.terminate();
                finish({
                    stdout: '',
                    stderr: error.message,
                    exitCode: 1,
                    error: error.message,
                    cwd,
                    workspace
                });
            });
            worker.on('exit', async code => {
                if (settled) {
                    return;
                }
                finish({
                    stdout: '',
                    stderr: code === 0 ? '' : `execute_code worker exited with code ${code}.`,
                    exitCode: code ?? 0,
                    error: code === 0 ? undefined : `execute_code worker exited with code ${code}.`,
                    cwd,
                    workspace
                });
            });
        });
    }

    private createWorkerSource(): string {
        return `
const { parentPort, workerData } = require('worker_threads');
const { createRequire } = require('module');
const { format } = require('util');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

(async () => {
    const requireFromCwd = createRequire(workerData.cwd + '/__execute_code__.js');
    const processProxy = Object.create(process);
    processProxy.cwd = () => workerData.cwd;
    processProxy.env = workerData.env;
    const module = { exports: {} };
    let stdout = '';
    let stderr = '';
    const consoleProxy = {
        log: (...args) => { stdout += format(...args) + '\\n'; },
        info: (...args) => { stdout += format(...args) + '\\n'; },
        warn: (...args) => { stderr += format(...args) + '\\n'; },
        error: (...args) => { stderr += format(...args) + '\\n'; }
    };
    const fn = new AsyncFunction('require', 'module', 'exports', 'console', 'process', '__dirname', '__filename', '"use strict";\\nreturn (async () => {\\n' + workerData.code + '\\n})();');
    await fn(requireFromCwd, module, module.exports, consoleProxy, processProxy, workerData.cwd, workerData.cwd + '/__execute_code__.js');
    parentPort.postMessage({ stdout, stderr, exitCode: 0 });
})().catch(error => {
    parentPort.postMessage({
        stdout: '',
        stderr: error && error.stack ? String(error.stack) : String(error?.message || error),
        exitCode: 1,
        error: error && error.stack ? String(error.stack) : String(error?.message || error)
    });
});
`;
    }
}

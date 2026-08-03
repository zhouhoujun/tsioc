import { Injectable } from '@tsdi/ioc';
import {
    AgentHookCommandExecutor,
    AgentHookExecutionRequest,
    AgentHookExecutionResult,
    loadSandboxSpawnModule,
    resolvePlatformShellCommand
} from '@tsdi/agent';

@Injectable()
export class NodeAgentHookCommandExecutor extends AgentHookCommandExecutor {
    isSupported(): boolean {
        return typeof process?.pid === 'number';
    }

    async execute(request: AgentHookExecutionRequest): Promise<AgentHookExecutionResult> {
        const startTime = Date.now();
        const resolved = resolvePlatformShellCommand(
            request.command,
            request.args ?? [],
            {
                os: process.platform,
                shellFamily: process.platform === 'win32' ? 'cmd' : 'posix'
            }
        );
        try {
            const { spawn } = await loadSandboxSpawnModule();
            return await new Promise<AgentHookExecutionResult>((resolve) => {
                const child = spawn(resolved.command, resolved.args, {
                    cwd: request.cwd || process.cwd(),
                    env: { ...process.env, ...(request.env ?? {}) },
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                let stdout = '';
                let stderr = '';
                let settled = false;
                const timeoutMs = Math.max(Number(request.timeoutMs || 0), 0);
                const timer = timeoutMs > 0 ? setTimeout(() => {
                    try {
                        child.kill();
                    } catch {
                        // ignore
                    }
                }, timeoutMs) : undefined;
                const finish = (result: AgentHookExecutionResult) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    if (timer) {
                        clearTimeout(timer);
                    }
                    resolve(result);
                };
                child.stdout?.on('data', (chunk: Uint8Array) => {
                    stdout += chunk.toString();
                });
                child.stderr?.on('data', (chunk: Uint8Array) => {
                    stderr += chunk.toString();
                });
                child.on('close', (code: number | null) => {
                    finish({
                        exitCode: code ?? 1,
                        stdout,
                        stderr,
                        durationMs: Date.now() - startTime,
                        error: code === 0 ? undefined : (stderr.trim() || undefined)
                    });
                });
                child.on('error', (error: Error) => {
                    finish({
                        exitCode: 1,
                        stdout,
                        stderr: stderr ? `${stderr}\n${error.message}` : error.message,
                        durationMs: Date.now() - startTime,
                        error: error.message
                    });
                });
                if (request.stdin) {
                    child.stdin?.write(request.stdin);
                }
                child.stdin?.end();
            });
        } catch (error) {
            return {
                exitCode: 1,
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                durationMs: Date.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

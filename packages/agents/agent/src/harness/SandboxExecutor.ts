import { Abstract, Injectable } from '@tsdi/ioc';

/**
 * Isolation level for sandbox execution.
 */
export type SandboxIsolationLevel = 'none' | 'process' | 'container';

/**
 * Resource limits for sandbox execution.
 */
export interface SandboxResourceLimits {
    /** Maximum CPU time in milliseconds */
    cpuTimeMs?: number;
    /** Maximum memory in bytes */
    memoryBytes?: number;
    /** Maximum execution wall time in milliseconds */
    wallTimeMs?: number;
    /** Maximum number of subprocesses */
    maxProcesses?: number;
    /** Maximum file system writes in bytes */
    maxFsWrites?: number;
}

/**
 * Sandbox configuration for tool execution.
 */
export interface SandboxPolicy {
    /** Whether sandboxing is enabled */
    enabled: boolean;
    /** Isolation level */
    isolationLevel: SandboxIsolationLevel;
    /** Resource limits */
    resourceLimits?: SandboxResourceLimits;
    /** Working directory for execution */
    workingDirectory?: string;
    /** Allowed environment variables (empty = inherit all) */
    allowedEnvVars?: string[];
    /** Denied environment variables */
    deniedEnvVars?: string[];
    /** Allowed network access */
    networkAccess?: 'none' | 'outbound' | 'full';
    /** Allowed filesystem paths (empty = deny all writes) */
    allowedWritePaths?: string[];
    /** Denied filesystem paths */
    deniedWritePaths?: string[];
}

/**
 * Result of sandbox execution.
 */
export interface SandboxExecutionResult {
    /** Exit code (0 = success) */
    exitCode: number;
    /** Standard output */
    stdout: string;
    /** Standard error */
    stderr: string;
    /** Wall time in milliseconds */
    wallTimeMs: number;
    /** CPU time in milliseconds (if available) */
    cpuTimeMs?: number;
    /** Peak memory usage in bytes (if available) */
    peakMemoryBytes?: number;
    /** Whether the execution was killed due to resource limits */
    killedByLimits?: boolean;
    /** Error message if execution failed */
    error?: string;
}

/**
 * Abstract sandbox executor interface.
 * Implementations provide different isolation mechanisms (process, container, etc.).
 */
@Abstract()
export abstract class SandboxExecutor {
    /**
     * Check if sandbox execution is supported on this platform.
     */
    abstract isSupported(): boolean;

    /**
     * Execute a command in a sandboxed environment.
     * @param command The command to execute
     * @param args Command arguments
     * @param options Execution options
     */
    abstract execute(
        command: string,
        args: string[],
        options: {
            policy: SandboxPolicy;
            env?: Record<string, string>;
            timeoutMs?: number;
        }
    ): Promise<SandboxExecutionResult>;

    /**
     * Clean up any resources associated with sandbox execution.
     */
    abstract cleanup(): Promise<void>;
}

/**
 * Default sandbox executor that uses Node.js child_process with basic isolation.
 * This provides process-level isolation without container overhead.
 */
@Injectable()
export class NodeChildProcessSandboxExecutor extends SandboxExecutor {
    private activeProcesses = new Set<any>();

    isSupported(): boolean {
        return typeof process !== 'undefined' && typeof process.pid === 'number';
    }

    async execute(
        command: string,
        args: string[],
        options: {
            policy: SandboxPolicy;
            env?: Record<string, string>;
            timeoutMs?: number;
        }
    ): Promise<SandboxExecutionResult> {
        const { policy, env, timeoutMs } = options;
        const startTime = Date.now();

        return new Promise((resolve) => {
            try {
                // Use dynamic import for child_process to support browser environments
                import('child_process').then(({ spawn }) => {
                    const resolvedEnv = this.resolveEnvironment(policy, env);
                    const resolvedCwd = policy.workingDirectory || process.cwd();
                    const wallTimeMs = policy.resourceLimits?.wallTimeMs || timeoutMs || 30000;

                    const child = spawn(command, args, {
                        cwd: resolvedCwd,
                        env: resolvedEnv,
                        stdio: ['pipe', 'pipe', 'pipe'],
                        timeout: wallTimeMs
                    });

                    this.activeProcesses.add(child);

                    let stdout = '';
                    let stderr = '';
                    let killedByLimits = false;

                    child.stdout?.on('data', (data: Buffer) => {
                        stdout += data.toString();
                    });

                    child.stderr?.on('data', (data: Buffer) => {
                        stderr += data.toString();
                    });

                    // Set up wall time limit
                    const wallTimer = setTimeout(() => {
                        killedByLimits = true;
                        this.killProcess(child);
                    }, wallTimeMs);

                    // Set up memory limit (if available)
                    let peakMemoryBytes = 0;
                    let memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
                    if (policy.resourceLimits?.memoryBytes) {
                        memoryCheckInterval = setInterval(() => {
                            try {
                                const memUsage = (process as any).memoryUsage?.();
                                if (memUsage && memUsage.rss > peakMemoryBytes) {
                                    peakMemoryBytes = memUsage.rss;
                                }
                                if (policy.resourceLimits?.memoryBytes && memUsage && memUsage.rss > policy.resourceLimits.memoryBytes) {
                                    killedByLimits = true;
                                    this.killProcess(child);
                                    if (memoryCheckInterval) {
                                        clearInterval(memoryCheckInterval);
                                    }
                                }
                            } catch {
                                // Ignore memory check errors
                            }
                        }, 100);
                    }

                    child.on('close', (code) => {
                        clearTimeout(wallTimer);
                        if (memoryCheckInterval) {
                            clearInterval(memoryCheckInterval);
                        }
                        this.activeProcesses.delete(child);

                        const wallTime = Date.now() - startTime;
                        resolve({
                            exitCode: code ?? 1,
                            stdout,
                            stderr,
                            wallTimeMs: wallTime,
                            peakMemoryBytes: peakMemoryBytes || undefined,
                            killedByLimits
                        });
                    });

                    child.on('error', (err) => {
                        clearTimeout(wallTimer);
                        if (memoryCheckInterval) {
                            clearInterval(memoryCheckInterval);
                        }
                        this.activeProcesses.delete(child);

                        const wallTime = Date.now() - startTime;
                        resolve({
                            exitCode: 1,
                            stdout,
                            stderr: stderr + '\n' + err.message,
                            wallTimeMs: wallTime,
                            error: err.message
                        });
                    });
                }).catch((err) => {
                    const wallTime = Date.now() - startTime;
                    resolve({
                        exitCode: 1,
                        stdout: '',
                        stderr: err.message,
                        wallTimeMs: wallTime,
                        error: `Failed to import child_process: ${err.message}`
                    });
                });
            } catch (err) {
                const wallTime = Date.now() - startTime;
                resolve({
                    exitCode: 1,
                    stdout: '',
                    stderr: err instanceof Error ? err.message : String(err),
                    wallTimeMs: wallTime,
                    error: err instanceof Error ? err.message : String(err)
                });
            }
        });
    }

    async cleanup(): Promise<void> {
        for (const child of this.activeProcesses) {
            this.killProcess(child);
        }
        this.activeProcesses.clear();
    }

    private resolveEnvironment(
        policy: SandboxPolicy,
        customEnv?: Record<string, string>
    ): Record<string, string | undefined> {
        const baseEnv: Record<string, string | undefined> = {};

        // Inherit PATH and other critical system vars
        if (process.env?.PATH) {
            baseEnv.PATH = process.env.PATH;
        }

        // Apply allowed env vars
        if (policy.allowedEnvVars && policy.allowedEnvVars.length > 0) {
            for (const key of policy.allowedEnvVars) {
                if (process.env?.[key] !== undefined) {
                    baseEnv[key] = process.env[key];
                }
            }
        }

        // Apply custom env vars (override base)
        if (customEnv) {
            for (const [key, value] of Object.entries(customEnv)) {
                if (policy.deniedEnvVars?.includes(key)) {
                    continue;
                }
                baseEnv[key] = value;
            }
        }

        // Remove denied env vars
        if (policy.deniedEnvVars) {
            for (const key of policy.deniedEnvVars) {
                delete baseEnv[key];
            }
        }

        return baseEnv;
    }

    private killProcess(child: any): void {
        try {
            if (typeof child.kill === 'function') {
                child.kill('SIGTERM');
                // Force kill after 1 second if still alive
                setTimeout(() => {
                    try {
                        if (child.pid && !child.killed) {
                            child.kill('SIGKILL');
                        }
                    } catch {
                        // Ignore kill errors
                    }
                }, 1000);
            }
        } catch {
            // Ignore kill errors
        }
    }
}

/**
 * No-op sandbox executor for when sandboxing is disabled.
 */
@Injectable()
export class NoopSandboxExecutor extends SandboxExecutor {
    isSupported(): boolean {
        return true;
    }

    async execute(
        command: string,
        args: string[],
        options: {
            policy: SandboxPolicy;
            env?: Record<string, string>;
            timeoutMs?: number;
        }
    ): Promise<SandboxExecutionResult> {
        const startTime = Date.now();
        try {
            const { spawn } = await import('child_process');
            const child = spawn(command, args, {
                cwd: options.policy.workingDirectory || process.cwd(),
                env: { ...process.env, ...options.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            return new Promise((resolve) => {
                child.on('close', (code) => {
                    resolve({
                        exitCode: code ?? 1,
                        stdout,
                        stderr,
                        wallTimeMs: Date.now() - startTime
                    });
                });

                child.on('error', (err) => {
                    resolve({
                        exitCode: 1,
                        stdout,
                        stderr: stderr + '\n' + err.message,
                        wallTimeMs: Date.now() - startTime,
                        error: err.message
                    });
                });
            });
        } catch (err) {
            return {
                exitCode: 1,
                stdout: '',
                stderr: err instanceof Error ? err.message : String(err),
                wallTimeMs: Date.now() - startTime,
                error: err instanceof Error ? err.message : String(err)
            };
        }
    }

    async cleanup(): Promise<void> {
        // No-op
    }
}

/**
 * Default sandbox policy for tool execution.
 */
export const defaultSandboxPolicy: SandboxPolicy = {
    enabled: false,
    isolationLevel: 'none',
    networkAccess: 'full'
};

/**
 * Restricted sandbox policy for untrusted tool execution.
 */
export const restrictedSandboxPolicy: SandboxPolicy = {
    enabled: true,
    isolationLevel: 'process',
    resourceLimits: {
        cpuTimeMs: 30000,
        memoryBytes: 256 * 1024 * 1024, // 256MB
        wallTimeMs: 60000,
        maxProcesses: 10,
        maxFsWrites: 10 * 1024 * 1024 // 10MB
    },
    networkAccess: 'none',
    allowedWritePaths: ['/tmp', '/var/tmp'],
    deniedEnvVars: ['AWS_SECRET', 'API_KEY', 'TOKEN']
};

/**
 * Create a custom sandbox policy with specific options.
 */
export function createSandboxPolicy(overrides: Partial<SandboxPolicy>): SandboxPolicy {
    return {
        ...defaultSandboxPolicy,
        ...overrides
    };
}

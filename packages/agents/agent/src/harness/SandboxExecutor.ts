import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationArguments } from '@tsdi/core';
import { AgentOptions } from '../options';
import { AGENT_OPTIONS, AGENT_SANDBOX_RUNTIME } from '../tokens';
import {
    buildSandboxExecCommand,
    commandReferencesAllowlistedDestination,
    detectSandboxExecTool,
    loadSandboxSpawnModule,
    probeSandboxExecTool,
    resolvePlatformShellCommand,
    SandboxExecProbe,
    SandboxRuntimeContext,
    SandboxExecToolProbe,
    SandboxMode
} from './sandbox-exec';

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
    /**
     * OS-level sandbox mode. When set to 'workspace' or 'network-block' and an
     * OS sandbox tool (bwrap/unshare/sandbox-exec) is available, commands are
     * wrapped with that tool before execution.
     */
    osSandbox?: import('./sandbox-exec').SandboxMode;
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

interface HostProcessLike {
    pid?: number;
    env?: Record<string, any>;
    cwd?: () => string;
    memoryUsage?: () => { rss?: number } | undefined;
}

function resolveHostProcess(): HostProcessLike | undefined {
    const candidate = (globalThis as { process?: HostProcessLike }).process;
    return candidate && typeof candidate === 'object' ? candidate : undefined;
}

/**
 * Default sandbox executor that uses the host process spawner with basic isolation.
 * This provides process-level isolation without container overhead.
 */
@Injectable()
export class NodeChildProcessSandboxExecutor extends SandboxExecutor {
    private activeProcesses = new Set<any>();

    constructor(
        @Optional() @Inject(ApplicationArguments) protected execAppArgs?: ApplicationArguments | null
    ) {
        super();
    }

    isSupported(): boolean {
        return typeof this.getHostProcess()?.pid === 'number';
    }

    protected getHostProcess(): HostProcessLike | undefined {
        return resolveHostProcess();
    }

    protected getProcessEnvSource(): Record<string, any> {
        return this.execAppArgs?.env
            || this.getHostProcess()?.env
            || {};
    }

    protected getDefaultWorkingDirectory(): string {
        return this.execAppArgs?.cwd
            || this.getHostProcess()?.cwd?.()
            || '.';
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
                // Use lazy loading so browser bundles can keep the spawner path unreachable.
                loadSandboxSpawnModule().then(({ spawn }) => {
                    const resolvedEnv = this.resolveEnvironment(policy, env);
                    const resolvedCwd = policy.workingDirectory || this.getDefaultWorkingDirectory();
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

                    child.stdout?.on('data', (data: Uint8Array) => {
                        stdout += data.toString();
                    });

                    child.stderr?.on('data', (data: Uint8Array) => {
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
                                const memUsage = this.getHostProcess()?.memoryUsage?.();
                                const rss = typeof memUsage?.rss === 'number' ? memUsage.rss : 0;
                                if (rss > peakMemoryBytes) {
                                    peakMemoryBytes = rss;
                                }
                                if (policy.resourceLimits?.memoryBytes && rss > policy.resourceLimits.memoryBytes) {
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

                    child.on('close', (code: number | null) => {
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

                    child.on('error', (err: Error) => {
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
                        error: `Failed to load process spawner: ${err.message}`
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
        const envSource = this.getProcessEnvSource();

        // Inherit PATH and other critical system vars
        if (envSource?.PATH) {
            baseEnv.PATH = envSource.PATH;
        }

        // Apply allowed env vars
        if (policy.allowedEnvVars && policy.allowedEnvVars.length > 0) {
            for (const key of policy.allowedEnvVars) {
                if (envSource?.[key] !== undefined) {
                    baseEnv[key] = envSource[key];
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
                child.kill();
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
    constructor(
        @Optional() @Inject(ApplicationArguments) protected appArgs?: ApplicationArguments | null
    ) {
        super();
    }

    isSupported(): boolean {
        return true;
    }

    protected getHostProcess(): HostProcessLike | undefined {
        return resolveHostProcess();
    }

    protected getProcessEnvSource(): Record<string, any> {
        return this.appArgs?.env
            || this.getHostProcess()?.env
            || {};
    }

    protected getDefaultWorkingDirectory(): string {
        return this.appArgs?.cwd
            || this.getHostProcess()?.cwd?.()
            || '.';
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
            const { spawn } = await loadSandboxSpawnModule();
            const child = spawn(command, args, {
                cwd: options.policy.workingDirectory || this.getDefaultWorkingDirectory(),
                env: { ...this.getProcessEnvSource(), ...options.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data: Uint8Array) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data: Uint8Array) => {
                stderr += data.toString();
            });

            return new Promise((resolve) => {
                child.on('close', (code: number | null) => {
                    resolve({
                        exitCode: code ?? 1,
                        stdout,
                        stderr,
                        wallTimeMs: Date.now() - startTime
                    });
                });

                child.on('error', (err: Error) => {
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
 * OS-sandbox-aware executor. When the effective sandbox mode (policy
 * `osSandbox` or configured `AgentOptions.sandbox.mode`) is 'workspace' or
 * 'network-block' and an OS sandbox tool is detected, commands are wrapped
 * with the tool before running; otherwise it degrades to the
 * `NodeChildProcessSandboxExecutor` behavior (env filtering + resource limits).
 */
@Injectable()
export class OsSandboxExecutor extends NodeChildProcessSandboxExecutor {
    private detectionPromise?: Promise<SandboxExecProbe>;

    constructor(
        @Optional() @Inject(AGENT_OPTIONS) private agentOptions?: AgentOptions,
        @Optional() @Inject(AGENT_SANDBOX_RUNTIME) private runtime?: SandboxRuntimeContext | null,
        @Optional() private probe?: SandboxExecToolProbe,
        @Optional() private appArgs?: ApplicationArguments | null
    ) {
        super(appArgs);
    }

    private get configuredMode(): SandboxMode {
        return this.agentOptions?.sandbox?.mode ?? 'off';
    }

    private detectTool(): Promise<SandboxExecProbe> {
        if (!this.detectionPromise) {
            const runtime = this.resolveRuntimeContext();
            const probe = this.probe ?? ((name: string) => probeSandboxExecTool(name, runtime));
            this.detectionPromise = detectSandboxExecTool(runtime?.os, probe, runtime);
        }
        return this.detectionPromise;
    }

    private resolveRuntimeContext(): SandboxRuntimeContext | undefined {
        if (this.runtime) {
            return this.runtime;
        }
        if (this.appArgs?.platform === 'browser' || this.appArgs?.platform === 'web') {
            return { os: 'browser', shellFamily: 'none' };
        }
        return undefined;
    }

    override isSupported(): boolean {
        return super.isSupported();
    }

    override async execute(
        command: string,
        args: string[],
        options: {
            policy: SandboxPolicy;
            env?: Record<string, string>;
            timeoutMs?: number;
        }
    ): Promise<SandboxExecutionResult> {
        const resolved = resolvePlatformShellCommand(command, args, this.resolveRuntimeContext());
        const proxy = this.agentOptions?.sandbox?.proxy;
        const proxyUrl = proxy?.https || proxy?.http;
        if (proxy?.required && options.policy.networkAccess !== 'none' && !proxyUrl) {
            return {
                exitCode: 1,
                stdout: '',
                stderr: 'Sandbox proxy enforcement rejected execution: no HTTP/HTTPS proxy is configured.',
                wallTimeMs: 0,
                error: 'sandbox_proxy_required'
            };
        }
        const proxyEnv = proxyUrl ? {
            ...(proxy?.http ? { HTTP_PROXY: proxy.http, http_proxy: proxy.http } : {}),
            ...(proxy?.https ? { HTTPS_PROXY: proxy.https, https_proxy: proxy.https } : {}),
            ...(proxy?.noProxy?.length ? { NO_PROXY: proxy.noProxy.join(','), no_proxy: proxy.noProxy.join(',') } : {})
        } : {};
        const executionOptions = { ...options, env: { ...options.env, ...proxyEnv } };
        const mode = options.policy.osSandbox ?? this.configuredMode;
        // A3: with a network allowlist configured, commands that reference an
        // allowlisted destination drop the network block (still workspace-
        // restricted), approximating a network destination allowlist.
        const effectiveMode = mode === 'network-block'
            && commandReferencesAllowlistedDestination(
                [resolved.command, ...resolved.args].join(' '),
                this.agentOptions?.sandbox?.networkAllowlist
            )
            ? 'workspace'
            : mode;
        if (effectiveMode !== 'off') {
            const probe = await this.detectTool();
            if (probe.tool) {
                const wrapped = buildSandboxExecCommand(probe.tool, effectiveMode, resolved.command, resolved.args, {
                    workspace: options.policy.workingDirectory
                });
                if (wrapped) {
                    return super.execute(wrapped.command, wrapped.args, executionOptions);
                }
            }
        }
        return super.execute(resolved.command, resolved.args, executionOptions);
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

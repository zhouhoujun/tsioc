import { SandboxMode } from './sandbox-exec';

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
    osSandbox?: SandboxMode;
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
    /** Whether the execution was stopped because the owning turn was cancelled */
    cancelled?: boolean;
    /** Error message if execution failed */
    error?: string;
}

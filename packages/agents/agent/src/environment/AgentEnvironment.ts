import type { FileAdapter } from '@tsdi/common';
import { CANCELLED_MESSAGE, runChildProcess } from '../harness/child-process-runner';

export interface AgentEnvironmentCommandRequest {
    command: string;
    cwd?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
}

export interface AgentEnvironmentCommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut?: boolean;
}

export interface AgentEnvironmentEntry {
    name: string;
    kind: 'file' | 'directory' | 'other';
}

/**
 * P3.3: environment abstraction for file/shell access. Tools can read
 * `AgentToolContext.environment`; the default is a local workspace, while
 * remote hosts (SSH/ACP/gateway) can provide a transport-backed implementation.
 */
export interface AgentEnvironment {
    readonly kind: 'local' | 'remote';
    readonly root?: string;
    readText(path: string): Promise<string>;
    writeText(path: string, content: string): Promise<void>;
    list(path: string): Promise<AgentEnvironmentEntry[]>;
    mkdir?(path: string, options?: { recursive?: boolean }): Promise<void>;
    remove?(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
    exec?(request: AgentEnvironmentCommandRequest): Promise<AgentEnvironmentCommandResult>;
}

/** Local workspace implementation (FileAdapter + child process runner). */
export class LocalEnvironment implements AgentEnvironment {
    readonly kind = 'local' as const;

    constructor(private readonly adapter: FileAdapter | undefined, readonly root?: string) {
    }

    async readText(path: string): Promise<string> {
        this.requireAdapter();
        return this.adapter!.readText(path);
    }

    async writeText(path: string, content: string): Promise<void> {
        this.requireAdapter();
        await this.adapter!.writeText(path, content);
    }

    async list(path: string): Promise<AgentEnvironmentEntry[]> {
        this.requireAdapter();
        return this.adapter!.list(path);
    }

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
        this.requireAdapter();
        await this.adapter!.mkdir(path, options);
    }

    async remove(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
        this.requireAdapter();
        await this.adapter!.remove(path, options);
    }

    async exec(request: AgentEnvironmentCommandRequest): Promise<AgentEnvironmentCommandResult> {
        const outcome = await runChildProcess({
            command: request.command,
            cwd: request.cwd ?? this.root,
            shell: true,
            timeoutMs: request.timeoutMs ?? 180000,
            signal: request.signal
        });
        if (outcome.kind === 'cancelled') {
            throw new Error(CANCELLED_MESSAGE);
        }
        if (outcome.kind === 'error') {
            throw outcome.error;
        }
        return {
            stdout: outcome.stdout.trim(),
            stderr: outcome.stderr.trim(),
            exitCode: outcome.kind === 'timeout' ? 124 : outcome.exitCode ?? 0,
            timedOut: outcome.kind === 'timeout'
        };
    }

    private requireAdapter(): void {
        if (!this.adapter) {
            throw new Error('Local environment requires a FileAdapter.');
        }
    }
}

/** Transport a remote host (SSH/ACP/gateway) implements for the runtime. */
export interface RemoteEnvironmentTransport {
    readText(path: string): Promise<string>;
    writeText(path: string, content: string): Promise<void>;
    list(path: string): Promise<AgentEnvironmentEntry[]>;
    mkdir?(path: string, options?: { recursive?: boolean }): Promise<void>;
    remove?(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
    exec?(request: AgentEnvironmentCommandRequest): Promise<AgentEnvironmentCommandResult>;
}

export function createRemoteEnvironment(transport: RemoteEnvironmentTransport, root?: string): AgentEnvironment {
    return {
        kind: 'remote',
        root,
        readText: path => transport.readText(path),
        writeText: (path, content) => transport.writeText(path, content),
        list: path => transport.list(path),
        ...(transport.mkdir ? { mkdir: (path, options) => transport.mkdir!(path, options) } : {}),
        ...(transport.remove ? { remove: (path, options) => transport.remove!(path, options) } : {}),
        ...(transport.exec ? { exec: request => transport.exec!(request) } : {})
    };
}

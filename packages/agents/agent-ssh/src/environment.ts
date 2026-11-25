import { Buffer } from 'buffer';
import type {
    AgentEnvironment,
    AgentEnvironmentEntry,
    RemoteEnvironmentTransport
} from '@tsdi/agent';
import { createRemoteEnvironment } from '@tsdi/agent';
import type { SshClient, SshExecResult } from './ssh-client';

export interface SshEnvironmentClient {
    exec(command: string, timeoutMs?: number, signal?: AbortSignal): Promise<SshExecResult>;
}

function shellQuote(value: string): string {
    return `'${String(value ?? '').replace(/'/g, `'\\''`)}'`;
}

function requireSuccess(result: SshExecResult, action: string): void {
    if (result.exitCode !== 0) {
        throw new Error(`SSH ${action} failed (${result.exitCode}): ${result.stderr || result.stdout || 'no output'}`);
    }
}

/** P3.3: SSH transport for AgentEnvironment (files via shell coreutils). */
export function createSshEnvironmentTransport(client: SshEnvironmentClient, timeoutMs = 60000): RemoteEnvironmentTransport {
    return {
        async readText(path: string): Promise<string> {
            const result = await client.exec(`cat -- ${shellQuote(path)}`, timeoutMs);
            requireSuccess(result, 'read');
            return result.stdout;
        },
        async writeText(path: string, content: string): Promise<void> {
            const encoded = Buffer.from(content, 'utf8').toString('base64');
            const dir = path.replace(/\/[^/]*$/, '') || '/';
            const result = await client.exec(
                `mkdir -p -- ${shellQuote(dir)} && printf %s ${shellQuote(encoded)} | base64 -d > ${shellQuote(path)}`,
                timeoutMs
            );
            requireSuccess(result, 'write');
        },
        async list(path: string): Promise<AgentEnvironmentEntry[]> {
            const result = await client.exec(
                `find ${shellQuote(path)} -mindepth 1 -maxdepth 1 -printf '%f\\t%y\\n' 2>/dev/null`,
                timeoutMs
            );
            requireSuccess(result, 'list');
            return result.stdout
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    const [name, type] = line.split('\t');
                    return {
                        name,
                        kind: type === 'd' ? 'directory' as const : type === 'f' ? 'file' as const : 'other' as const
                    };
                });
        },
        async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
            requireSuccess(await client.exec(`mkdir ${options?.recursive === false ? '' : '-p '}-- ${shellQuote(path)}`, timeoutMs), 'mkdir');
        },
        async rename(from: string, to: string): Promise<void> {
            requireSuccess(await client.exec(`mv -f -- ${shellQuote(from)} ${shellQuote(to)}`, timeoutMs), 'rename');
        },
        async remove(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
            requireSuccess(await client.exec(`rm ${options?.recursive === false ? '' : '-r '}${options?.force === false ? '' : '-f '}-- ${shellQuote(path)}`, timeoutMs), 'remove');
        },
        async exec(request) {
            const result = await client.exec(request.command, request.timeoutMs ?? timeoutMs, request.signal);
            return {
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                timedOut: result.timedOut
            };
        }
    };
}

export function createSshEnvironment(client: SshEnvironmentClient, root?: string, timeoutMs?: number): AgentEnvironment {
    return createRemoteEnvironment(createSshEnvironmentTransport(client, timeoutMs), root);
}

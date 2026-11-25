import type {
    AgentEnvironment,
    AgentEnvironmentEntry,
    RemoteEnvironmentTransport
} from '@tsdi/agent';
import { createRemoteEnvironment } from '@tsdi/agent';
import type { AgentIoPort } from './io-port';

function shellQuote(value: string): string {
    return `'${String(value ?? '').replace(/'/g, `'\\''`)}'`;
}

/**
 * P3.3: adapt any host IO port (ACP/gateway/remote terminal) to the
 * AgentEnvironment used by tools. File reads/writes use the IO port's native
 * hooks when available; listing/mutation/exec use shell commands.
 */
export function createIoPortEnvironmentTransport(io: AgentIoPort, timeoutMs = 60000): RemoteEnvironmentTransport {
    return {
        async readText(path: string): Promise<string> {
            if (io.readTextFile) {
                const result = await io.readTextFile({ path });
                return result.content;
            }
            const result = await io.runCommand({ command: `cat -- ${shellQuote(path)}`, timeoutMs });
            if (result.exitCode !== 0) throw new Error(`read failed: ${result.stderr || result.stdout}`);
            return result.stdout;
        },
        async writeText(path: string, content: string): Promise<void> {
            if (io.writeTextFile) {
                await io.writeTextFile({ path, content });
                return;
            }
            const { Buffer } = await import('buffer');
            const encoded = Buffer.from(content, 'utf8').toString('base64');
            const dir = path.replace(/\/[^/]*$/, '') || '/';
            const result = await io.runCommand({
                command: `mkdir -p -- ${shellQuote(dir)} && printf %s ${shellQuote(encoded)} | base64 -d > ${shellQuote(path)}`,
                timeoutMs
            });
            if (result.exitCode !== 0) throw new Error(`write failed: ${result.stderr || result.stdout}`);
        },
        async list(path: string): Promise<AgentEnvironmentEntry[]> {
            const result = await io.runCommand({
                command: `find ${shellQuote(path)} -mindepth 1 -maxdepth 1 -printf '%f\\t%y\\n' 2>/dev/null`,
                timeoutMs
            });
            if (result.exitCode !== 0) throw new Error(`list failed: ${result.stderr || result.stdout}`);
            return result.stdout.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
                const [name, type] = line.split('\t');
                return { name, kind: type === 'd' ? 'directory' as const : type === 'f' ? 'file' as const : 'other' as const };
            });
        },
        async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
            const result = await io.runCommand({ command: `mkdir ${options?.recursive === false ? '' : '-p '}-- ${shellQuote(path)}`, timeoutMs });
            if (result.exitCode !== 0) throw new Error(`mkdir failed: ${result.stderr || result.stdout}`);
        },
        async rename(from: string, to: string): Promise<void> {
            const result = await io.runCommand({ command: `mv -f -- ${shellQuote(from)} ${shellQuote(to)}`, timeoutMs });
            if (result.exitCode !== 0) throw new Error(`rename failed: ${result.stderr || result.stdout}`);
        },
        async remove(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
            const result = await io.runCommand({
                command: `rm ${options?.recursive === false ? '' : '-r '}${options?.force === false ? '' : '-f '}-- ${shellQuote(path)}`,
                timeoutMs
            });
            if (result.exitCode !== 0) throw new Error(`remove failed: ${result.stderr || result.stdout}`);
        },
        async exec(request) {
            const result = await io.runCommand({
                command: request.command,
                cwd: request.cwd,
                timeoutMs: request.timeoutMs ?? timeoutMs,
                signal: request.signal
            });
            return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, timedOut: result.timedOut };
        }
    };
}

export function createIoPortEnvironment(io: AgentIoPort, root?: string, timeoutMs?: number): AgentEnvironment {
    return createRemoteEnvironment(createIoPortEnvironmentTransport(io, timeoutMs), root);
}

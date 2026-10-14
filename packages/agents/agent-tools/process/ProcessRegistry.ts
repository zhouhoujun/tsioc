import { ChildProcess, spawn } from 'child_process';
import { Injectable } from '@tsdi/ioc';

export interface ManagedProcessRecord {
    id: string;
    sessionId: string;
    command: string;
    cwd: string;
    startedAt: number;
    finishedAt?: number;
    exitCode?: number | null;
    signal?: NodeJS.Signals | null;
    running: boolean;
    stdout: string;
    stderr: string;
}

/** Grace period between SIGTERM and the SIGKILL escalation when killing. */
const KILL_ESCALATION_MS = 3000;

@Injectable()
export class ProcessRegistry {
    private readonly records = new Map<string, ManagedProcessRecord>();
    private readonly children = new Map<string, ChildProcess>();
    private readonly killTimers = new Map<string, NodeJS.Timeout>();

    assertSessionCapacity(sessionId: string, maxProcesses: number): void {
        if (this.countRunning(sessionId) >= maxProcesses) {
            throw new Error(`Process limit reached for session '${sessionId}'.`);
        }
    }

    start(sessionId: string, id: string, command: string, cwd: string, maxOutputChars: number, env?: NodeJS.ProcessEnv): ManagedProcessRecord {
        const child = spawn(command, {
            cwd,
            shell: true,
            detached: process.platform !== 'win32',
            env: env ?? process.env
        });
        const record: ManagedProcessRecord = {
            id,
            sessionId,
            command,
            cwd,
            startedAt: Date.now(),
            running: true,
            stdout: '',
            stderr: ''
        };
        this.records.set(id, record);
        this.children.set(id, child);

        child.stdout?.on('data', chunk => {
            record.stdout = this.appendOutput(record.stdout, String(chunk), maxOutputChars);
        });
        child.stderr?.on('data', chunk => {
            record.stderr = this.appendOutput(record.stderr, String(chunk), maxOutputChars);
        });
        child.on('close', (code, signal) => {
            record.running = false;
            record.exitCode = code ?? null as any;
            record.signal = signal;
            record.finishedAt = Date.now();
            this.children.delete(id);
            this.clearKillTimer(id);
        });
        child.on('error', error => {
            record.running = false;
            record.exitCode = 1;
            record.finishedAt = Date.now();
            record.stderr = this.appendOutput(record.stderr, `${error.message}\n`, maxOutputChars);
            this.children.delete(id);
            this.clearKillTimer(id);
        });

        return { ...record };
    }

    get(sessionId: string, id: string): ManagedProcessRecord | undefined {
        const record = this.records.get(id);
        if (!record || record.sessionId !== sessionId) {
            return undefined;
        }
        return { ...record };
    }

    kill(sessionId: string, id: string): ManagedProcessRecord | undefined {
        const record = this.records.get(id);
        if (!record || record.sessionId !== sessionId) {
            return undefined;
        }
        const child = this.children.get(id);
        if (child && record.running) {
            this.signal(child, 'SIGTERM');
            // SIGTERM is ignorable and a shell may hold the stdio pipe open; if
            // the process is still alive after the grace period, force-kill it so
            // the record stops running and the session's process slots are freed.
            const existing = this.killTimers.get(id);
            if (existing) {
                clearTimeout(existing);
            }
            const escalate = setTimeout(() => {
                this.killTimers.delete(id);
                const live = this.children.get(id);
                if (live && record.running) {
                    this.signal(live, 'SIGKILL');
                }
            }, KILL_ESCALATION_MS);
            if (typeof escalate.unref === 'function') {
                escalate.unref();
            }
            this.killTimers.set(id, escalate);
        }
        return { ...record };
    }

    private signal(child: ChildProcess, signal: NodeJS.Signals): void {
        if (process.platform !== 'win32' && typeof child.pid === 'number') {
            try {
                process.kill(-child.pid, signal);
                return;
            } catch {
                // fall through to a direct kill
            }
        }
        try {
            child.kill(signal);
        } catch {
            // process already gone
        }
    }

    private clearKillTimer(id: string): void {
        const timer = this.killTimers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.killTimers.delete(id);
        }
    }

    private countRunning(sessionId: string): number {
        let total = 0;
        this.records.forEach(record => {
            if (record.sessionId === sessionId && record.running) {
                total++;
            }
        });
        return total;
    }

    private appendOutput(current: string, chunk: string, maxChars: number): string {
        const merged = `${current}${chunk}`;
        return merged.length <= maxChars ? merged : merged.slice(merged.length - maxChars);
    }
}

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

@Injectable()
export class ProcessRegistry {
    private readonly records = new Map<string, ManagedProcessRecord>();
    private readonly children = new Map<string, ChildProcess>();

    assertSessionCapacity(sessionId: string, maxProcesses: number): void {
        if (this.countRunning(sessionId) >= maxProcesses) {
            throw new Error(`Process limit reached for session '${sessionId}'.`);
        }
    }

    start(sessionId: string, id: string, command: string, cwd: string, maxOutputChars: number): ManagedProcessRecord {
        const child = spawn(command, {
            cwd,
            shell: true,
            detached: process.platform !== 'win32',
            env: process.env
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
        });
        child.on('error', error => {
            record.running = false;
            record.exitCode = 1;
            record.finishedAt = Date.now();
            record.stderr = this.appendOutput(record.stderr, `${error.message}\n`, maxOutputChars);
            this.children.delete(id);
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
            if (process.platform !== 'win32' && typeof child.pid === 'number') {
                try {
                    process.kill(-child.pid, 'SIGTERM');
                } catch {
                    child.kill('SIGTERM');
                }
            } else {
                child.kill('SIGTERM');
            }
        }
        return { ...record };
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

import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { spawn } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TypeormAdapter } from '../src';
import { acquireSqljsLock, formatSqljsLockConflict, sqljsLockPath } from '../src/sqljs-lock';

/** Start a real child process and return its pid (it stays alive until killed). */
function spawnAlive(): Promise<{ pid: number; kill(): void }> {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });
    return new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('spawn', () => resolve({
            pid: child.pid!,
            kill: () => { try { child.kill('SIGKILL'); } catch { /* ignore */ } }
        }));
    });
}

/** Start a child and wait until it exits so its pid is definitely gone. */
function spawnExited(): Promise<number> {
    const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
    return new Promise(resolve => child.once('exit', () => resolve(child.pid!)));
}

@Suite('sqljs cross-process lock')
export class SqljsLockTest {
    private dir(): string {
        return mkdtempSync(join(tmpdir(), 'sqljs-lock-'));
    }

    @Test('acquiring records this pid and releasing removes the lock')
    acquireAndRelease() {
        const dir = this.dir();
        try {
            const location = join(dir, 'agent.db');
            const handle = acquireSqljsLock(location);
            expect(handle.conflict).toBeUndefined();
            const record = JSON.parse(readFileSync(sqljsLockPath(location), 'utf8'));
            expect(record.pid).toEqual(process.pid);
            handle.release();
            expect(existsSync(sqljsLockPath(location))).toBe(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('a lock held by another live process is reported as a conflict')
    async liveProcessConflicts() {
        const dir = this.dir();
        const other = await spawnAlive();
        try {
            const location = join(dir, 'agent.db');
            writeFileSync(sqljsLockPath(location), JSON.stringify({ pid: other.pid, startedAt: 123 }));
            const handle = acquireSqljsLock(location);
            expect(handle.conflict?.pid).toEqual(other.pid);
            expect(handle.conflict?.startedAt).toEqual(123);
            // The newest process owns the lock so a third one sees it.
            expect(JSON.parse(readFileSync(sqljsLockPath(location), 'utf8')).pid).toEqual(process.pid);
            // Releasing our own lock must not delete a foreign owner's file.
            writeFileSync(sqljsLockPath(location), JSON.stringify({ pid: other.pid, startedAt: 123 }));
            handle.release();
            expect(existsSync(sqljsLockPath(location))).toBe(true);
        } finally {
            other.kill();
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('a lock left by an exited process is stale and does not warn')
    async staleLockIsRecovered() {
        const dir = this.dir();
        const deadPid = await spawnExited();
        try {
            const location = join(dir, 'agent.db');
            writeFileSync(sqljsLockPath(location), JSON.stringify({ pid: deadPid, startedAt: 1 }));
            const handle = acquireSqljsLock(location);
            expect(handle.conflict).toBeUndefined();
            expect(JSON.parse(readFileSync(sqljsLockPath(location), 'utf8')).pid).toEqual(process.pid);
            handle.release();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('a malformed lock file is treated as stale')
    malformedLockIsStale() {
        const dir = this.dir();
        try {
            const location = join(dir, 'agent.db');
            writeFileSync(sqljsLockPath(location), 'not-json');
            const handle = acquireSqljsLock(location);
            expect(handle.conflict).toBeUndefined();
            handle.release();
            expect(existsSync(sqljsLockPath(location))).toBe(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('the adapter warns once for a concurrently used sql.js database')
    async adapterWarnsOnce() {
        const dir = this.dir();
        const other = await spawnAlive();
        const warnings: string[] = [];
        const originalWarn = console.warn;
        console.warn = (message?: any) => { warnings.push(String(message)); };
        try {
            const location = join(dir, 'agent.db');
            writeFileSync(sqljsLockPath(location), JSON.stringify({ pid: other.pid, startedAt: Date.now() }));
            const adapter = new TypeormAdapter({} as any);
            const dataSource = { options: { type: 'sqljs', location, autoSave: true } };
            (adapter as any).installSqljsLock(dataSource);
            (adapter as any).installSqljsLock(dataSource);
            expect(warnings.length).toEqual(1);
            expect(warnings[0]).toContain(`pid ${other.pid}`);
            expect(warnings[0]).toContain(location);
            expect(warnings[0]).toContain('lost updates');
            (adapter as any).releaseSqljsLocks();
            expect(existsSync(sqljsLockPath(location))).toBe(false);
        } finally {
            console.warn = originalWarn;
            other.kill();
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('an in-memory sqljs source takes no lock')
    noLockWithoutLocation() {
        const adapter = new TypeormAdapter({} as any);
        expect(() => (adapter as any).installSqljsLock({ options: { type: 'sqljs' } })).not.toThrow();
        expect((adapter as any).sqljsLocks.size).toEqual(0);
    }

    @Test('the warning names the pid, the file and the consequence')
    warningIsActionable() {
        const text = formatSqljsLockConflict({ location: '/x/agent.db', pid: 4321 });
        expect(text).toContain('pid 4321');
        expect(text).toContain('/x/agent.db');
        expect(text).toContain('lost updates');
        expect(text).toContain('--root');
    }
}

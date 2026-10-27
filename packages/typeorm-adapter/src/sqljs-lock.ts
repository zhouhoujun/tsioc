/**
 * Cross-process usage lock for file-backed sql.js databases.
 *
 * sql.js keeps the whole database in memory and rewrites the file on every
 * save, so two agents on one file silently overwrite each other's writes
 * (measured: 50 concurrent appends left 32 rows). The database stays
 * consistent, but updates are lost. There is no portable file lock in Node, so
 * a `<location>.lock` file records the owning pid; a second process that finds
 * a live pid warns instead of failing silently.
 *
 * The lock is advisory: the newest process takes it over (and warns), and
 * `release()` only removes the file when it still belongs to this process.
 */

export interface SqljsLockConflict {
    /** Database file both processes write. */
    location: string;
    /** Pid that already holds the lock and is still alive. */
    pid: number;
    /** When the other process took the lock (epoch ms), when readable. */
    startedAt?: number;
}

export interface SqljsLockHandle {
    /** Set when another live process owns the same database. */
    conflict?: SqljsLockConflict;
    release(): void;
}

interface LockRecord {
    pid: number;
    startedAt: number;
}

interface FileSystemLike {
    readFileSync(path: string, encoding: string): string;
    writeFileSync(path: string, data: string): void;
    rmSync(path: string, options?: { force?: boolean }): void;
}

interface ProcessLike {
    pid: number;
    kill(pid: number, signal?: number | string): boolean;
}

function loadFileSystem(): FileSystemLike | null {
    try {
        const req = typeof require === 'function' ? require : null;
        if (!req) {
            return null;
        }
        const fs = req('fs');
        return {
            readFileSync: (path, encoding) => fs.readFileSync(path, encoding),
            writeFileSync: (path, data) => fs.writeFileSync(path, data),
            rmSync: (path, options) => fs.rmSync(path, options)
        };
    } catch {
        return null;
    }
}

function loadProcess(): ProcessLike | null {
    const proc = (globalThis as any).process;
    if (!proc || typeof proc.kill !== 'function' || !Number.isInteger(proc.pid)) {
        return null;
    }
    return proc as ProcessLike;
}

function isAlive(proc: ProcessLike, pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) {
        return false;
    }
    try {
        proc.kill(pid, 0);
        return true;
    } catch (error) {
        // EPERM means the pid exists but belongs to another user.
        return (error as { code?: string })?.code === 'EPERM';
    }
}

function readLock(fs: FileSystemLike, file: string): LockRecord | undefined {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        const pid = Number(parsed?.pid);
        return Number.isInteger(pid) && pid > 0
            ? { pid, startedAt: Number(parsed?.startedAt) || 0 }
            : undefined;
    } catch {
        return undefined;
    }
}

/** Path of the advisory lock file for a sql.js database location. */
export function sqljsLockPath(location: string): string {
    return `${location}.lock`;
}

/**
 * Take the advisory lock for `location`.
 *
 * Returns `conflict` when another live process holds it; the caller decides how
 * to surface that. The lock is still taken over so a third process sees the
 * newest owner.
 */
export function acquireSqljsLock(location: string): SqljsLockHandle {
    const fs = loadFileSystem();
    const proc = loadProcess();
    if (!fs || !proc || !location) {
        return { release: () => undefined };
    }
    const file = sqljsLockPath(location);
    const existing = readLock(fs, file);
    const conflict = existing && existing.pid !== proc.pid && isAlive(proc, existing.pid)
        ? { location, pid: existing.pid, startedAt: existing.startedAt || undefined }
        : undefined;

    try {
        fs.writeFileSync(file, JSON.stringify({ pid: proc.pid, startedAt: Date.now() }));
    } catch {
        // A read-only directory must not break the agent; locking is advisory.
    }

    return {
        conflict,
        release: () => {
            const current = readLock(fs, file);
            if (current && current.pid !== proc.pid) {
                return;
            }
            try {
                fs.rmSync(file, { force: true });
            } catch {
                // ignore: a stale lock is recovered by the pid liveness check
            }
        }
    };
}

/** Human-readable warning for a detected concurrent writer. */
export function formatSqljsLockConflict(conflict: SqljsLockConflict): string {
    return [
        `[tsdi-agent] Another process (pid ${conflict.pid}) is using the same database: ${conflict.location}`,
        'Concurrent writes overwrite each other (lost updates). Close the other agent or start this one with a different --root.'
    ].join('\n');
}

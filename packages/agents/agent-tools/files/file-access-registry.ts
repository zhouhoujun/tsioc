/**
 * Process-wide registry of files read and written per session, used to enforce
 * the read-before-write guard (opencode parity): an existing file must be read
 * before write_file/edit_file may change it. Kept as module state (not DI) so
 * every tool instance shares the same view within a process.
 */
const readsBySession = new Map<string, Set<string>>();
const writesBySession = new Map<string, Set<string>>();

function normalizeKey(targetPath: unknown): string {
    return String(targetPath ?? '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

function setFor(map: Map<string, Set<string>>, sessionId: string): Set<string> {
    const key = String(sessionId || '').trim();
    let set = map.get(key);
    if (!set) {
        set = new Set<string>();
        map.set(key, set);
    }
    return set;
}

export function recordFileRead(sessionId: string, targetPath: unknown): void {
    const key = normalizeKey(targetPath);
    if (key) {
        setFor(readsBySession, sessionId).add(key);
    }
}

export function recordFileWrite(sessionId: string, targetPath: unknown): void {
    const key = normalizeKey(targetPath);
    if (key) {
        setFor(writesBySession, sessionId).add(key);
    }
}

export function hasFileBeenRead(sessionId: string, targetPath: unknown): boolean {
    return readsBySession.get(String(sessionId || '').trim())?.has(normalizeKey(targetPath)) === true;
}

export function hasFileBeenWritten(sessionId: string, targetPath: unknown): boolean {
    return writesBySession.get(String(sessionId || '').trim())?.has(normalizeKey(targetPath)) === true;
}

export function clearFileAccessRegistry(): void {
    readsBySession.clear();
    writesBySession.clear();
}

/**
 * A3: cross-platform environment access through a global guard.
 *
 * The `agent` library must not reference node APIs directly (`process`,
 * `Buffer`, `fs`, ...); environment information is read through
 * `(globalThis as { process?: ... }).process`. This module is the single
 * place where the `process.env` / `os.homedir` literals are allowed to appear
 * (grep acceptance: `packages/agents/agent/src` shows them only inside this
 * guard/injection utility).
 */

export interface HostProcessLikeEnv {
    env?: Record<string, string | undefined>;
}

/** Read the host process environment via the global guard (undefined in non-node hosts). */
export function resolveProcessEnv(): Record<string, string | undefined> | undefined {
    const candidate = (globalThis as { process?: HostProcessLikeEnv }).process;
    return candidate && typeof candidate === 'object' && candidate.env ? candidate.env : undefined;
}

/** Read a single environment value via the global guard. */
export function resolveEnvValue(key: string): string | undefined {
    return resolveProcessEnv()?.[key];
}

/**
 * Resolve the current user's home directory. Prefers `$HOME`, then the OS
 * lookup through a lazily-required node module (browser-safe: returns
 * undefined when `require` is unavailable or the lookup throws).
 */
export function resolveEnvHome(): string | undefined {
    const home = resolveProcessEnv()?.HOME;
    if (home) {
        return home;
    }
    try {
        const req = typeof require === 'function' ? require : null;
        if (!req) {
            return undefined;
        }
        const os = req('os');
        return typeof os.homedir === 'function' ? os.homedir() : undefined;
    } catch {
        return undefined;
    }
}
/**
 * Cross-platform access to the Node-like `process` global.
 *
 * Per the repo's cross-platform constraint, agent libraries must not import
 * node APIs directly; environment info is read through a typed global guard
 * so browser bundles stay clean and callers keep real types.
 */
export interface ProcessLike {
    env?: Record<string, string | undefined>;
    cwd?: () => string;
}

/** Returns the ambient `process` object, or undefined when running without one. */
export function getGlobalProcess(): ProcessLike | undefined {
    return (globalThis as { process?: ProcessLike }).process;
}

export interface ReducedMotionQuery {
    readonly matches: boolean;
    addEventListener?(type: 'change', listener: () => void): void;
    removeEventListener?(type: 'change', listener: () => void): void;
    addListener?(listener: () => void): void;
    removeListener?(listener: () => void): void;
}

export interface ReducedMotionHost {
    matchMedia?(query: string): ReducedMotionQuery;
}

/** Host-provided or system reduced-motion preference; absent hosts keep motion on. */
export function prefersReducedMotion(host?: ReducedMotionHost | null): boolean {
    try {
        return !!host?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    } catch {
        return false;
    }
}

/**
 * Subscribe to live reduced-motion changes. Returns a cleanup function; hosts
 * that do not expose matchMedia get a no-op subscription.
 */
export function observeReducedMotion(host: ReducedMotionHost | null | undefined, listener: () => void): () => void {
    let query: ReducedMotionQuery | undefined;
    try {
        query = host?.matchMedia?.('(prefers-reduced-motion: reduce)');
    } catch {
        query = undefined;
    }
    if (!query) {
        return () => undefined;
    }
    const notify = () => listener();
    if (query.addEventListener) {
        query.addEventListener('change', notify);
        return () => query?.removeEventListener?.('change', notify);
    }
    if (query.addListener) {
        query.addListener(notify);
        return () => query?.removeListener?.(notify);
    }
    return () => undefined;
}

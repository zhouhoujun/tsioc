import type {
    DynamicFormTypedCompletionItem,
    DynamicFormTypedCompletionResult,
    DynamicFormTypedCompletionSource
} from './dynamic-form.types';

/**
 * Expand a host suggestion list (`msg.payload`, `context.variables.name`, ...)
 * into the path form used by one typed source. Suggestions without the source
 * prefix are ignored so `msg` completion never offers `context.*` names.
 */
export function typedPathsFromSuggestions(suggestions: string[] | undefined, source: string): string[] {
    const prefix = `${source}.`;
    const paths = new Set<string>();
    (suggestions || []).forEach(value => {
        const text = String(value || '').trim();
        if (text.startsWith(prefix)) {
            const path = text.slice(prefix.length);
            if (path) {
                paths.add(path);
            }
        }
    });
    return Array.from(paths);
}

/**
 * Collect readable paths from a runtime value (`msg`, `flow`, `global`, ...).
 *
 * The walker is deliberately shallow and bounded: completion is a hint, not a
 * serializer, and runtime scopes may contain cycles or functions. Roots are
 * always offered even when the scope has not been populated yet, which keeps
 * `payload`/`topic`/`variables` completable before the first run.
 */
export function collectTypedPaths(
    value: any,
    roots: string[] = [],
    depth = 2,
    limit = 200
): string[] {
    const paths = new Set<string>(roots);
    const seen = new Set<any>();
    const walk = (current: any, prefix: string, level: number): void => {
        if (paths.size >= limit || level > depth) {
            return;
        }
        if (!current || typeof current !== 'object' || Array.isArray(current) || seen.has(current)) {
            return;
        }
        seen.add(current);
        let keys: string[];
        try {
            keys = Object.keys(current);
        } catch {
            return;
        }
        for (const key of keys) {
            if (paths.size >= limit) {
                return;
            }
            if (!key || key === 'get' || key === 'has' || key.startsWith('__')) {
                continue;
            }
            let child: any;
            try {
                child = current[key];
            } catch {
                continue;
            }
            if (typeof child === 'function') {
                continue;
            }
            const path = prefix ? `${prefix}.${key}` : key;
            paths.add(path);
            walk(child, path, level + 1);
        }
    };
    walk(value, '', 0);
    return Array.from(paths).slice(0, limit);
}

/** Filter path candidates by the current token; prefix matches win. */
export function filterTypedPaths(paths: string[], query: string, limit = 20): string[] {
    const token = String(query || '').trim().toLowerCase();
    const matches = (paths || []).filter(path => {
        const value = String(path || '');
        return !token || value.toLowerCase().startsWith(token);
    });
    // Exact/prefix matches are already the common case; alphabetical order is
    // stable and keeps the list predictable while typing.
    return matches.sort((left, right) => left.localeCompare(right)).slice(0, limit);
}

/** Build a completion source over a static path list (host/run context paths). */
export function createTypedPathCompletion(paths: string[], limit = 20): DynamicFormTypedCompletionSource {
    return (query: string): DynamicFormTypedCompletionItem[] =>
        filterTypedPaths(paths, query, limit).map(path => ({ label: path, value: path }));
}

/** Normalize a host completion result to the item array the widget consumes. */
export function normalizeTypedCompletion(
    result: DynamicFormTypedCompletionResult | DynamicFormTypedCompletionItem[] | undefined
): DynamicFormTypedCompletionItem[] {
    if (!result) {
        return [];
    }
    const items = Array.isArray(result) ? result : result.items;
    return (items || [])
        .filter(item => !!item && item.value !== undefined && item.value !== null)
        .map(item => ({
            label: String(item.label ?? '') || String(item.value),
            value: String(item.value),
            ...(item.description ? { description: String(item.description) } : {})
        }));
}

/**
 * Request/abort owner for typed-input completion.
 *
 * Mirrors the typeahead contract (`source(query, signal)`): a newer request
 * aborts the previous one and stale results are discarded, so a slow host
 * lookup can never overwrite suggestions for newer text.
 */
interface TypedCompletionState {
    sequence: number;
    abort?: AbortController;
}

/**
 * Request state lives outside the controller instance: components are wrapped
 * in the reactive proxy, and storing an `AbortController` as a proxied field
 * would route `abort()` through a proxy and break its private slots.
 */
const typedCompletionStates = new WeakMap<object, TypedCompletionState>();

function stateOf(controller: object): TypedCompletionState {
    let state = typedCompletionStates.get(controller);
    if (!state) {
        state = { sequence: 0 };
        typedCompletionStates.set(controller, state);
    }
    return state;
}

export class TypedCompletionController {
    async query(
        source: { completionSource?: DynamicFormTypedCompletionSource } | undefined,
        query: string
    ): Promise<DynamicFormTypedCompletionItem[]> {
        const completion = source?.completionSource;
        if (typeof completion !== 'function') {
            return [];
        }
        const state = stateOf(this);
        const sequence = ++state.sequence;
        state.abort?.abort();
        const abort = typeof AbortController === 'function' ? new AbortController() : undefined;
        state.abort = abort;
        try {
            const result = await completion(query, abort?.signal);
            if (sequence !== state.sequence) {
                return [];
            }
            return normalizeTypedCompletion(result);
        } catch (error) {
            if (sequence !== state.sequence) {
                return [];
            }
            throw error;
        }
    }

    cancel(): void {
        const state = stateOf(this);
        state.sequence += 1;
        state.abort?.abort();
        state.abort = undefined;
    }

    dispose(): void {
        this.cancel();
    }
}

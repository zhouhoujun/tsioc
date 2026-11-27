export const TYPEAHEAD_REQUEST_TIMEOUT_MS = 15_000;

export interface TypeaheadMachineResult<T> {
    items: T[];
    error?: string;
}

export interface TypeaheadLive<T> {
    readonly query: string;
    readonly shown: T[];
    /** Old rows kept while a newer query is pending; selecting them is host-defined. */
    readonly stale: boolean;
    readonly answered: boolean;
    readonly error: string;
    readonly attempt: number;
    readonly issued: number;
    readonly cache: ReadonlyMap<string, T[]>;
}

export type TypeaheadMachineState<T> =
    | (TypeaheadLive<T> & { readonly status: 'ready' | 'failed' })
    | (TypeaheadLive<T> & { readonly status: 'debouncing' | 'loading' })
    | { readonly status: 'disposed' };

export type TypeaheadMachineEvent<T> =
    | { readonly type: 'input.changed'; readonly query: string; readonly delayMs: number; readonly minChars: number }
    | { readonly type: 'debounce.elapsed'; readonly attempt: number }
    | { readonly type: 'request.succeeded'; readonly attempt: number; readonly result: TypeaheadMachineResult<T> }
    | { readonly type: 'request.failed'; readonly attempt: number; readonly message: string }
    | { readonly type: 'request.timed-out'; readonly attempt: number }
    | { readonly type: 'retry.requested' }
    | { readonly type: 'disposed' };

export type TypeaheadMachineEffect =
    | { readonly type: 'cancel' }
    | { readonly type: 'debounce'; readonly attempt: number; readonly delayMs: number }
    | { readonly type: 'request'; readonly attempt: number; readonly query: string };

export interface TypeaheadMachineTransition<T> {
    readonly state: TypeaheadMachineState<T>;
    readonly effects: readonly TypeaheadMachineEffect[];
}

const NONE: readonly TypeaheadMachineEffect[] = Object.freeze([]);
const CANCEL: readonly TypeaheadMachineEffect[] = Object.freeze([{ type: 'cancel' }]);

export function createTypeaheadMachineState<T>(): TypeaheadMachineState<T> {
    return {
        status: 'ready',
        query: '',
        shown: [],
        stale: false,
        answered: false,
        error: '',
        attempt: 0,
        issued: 0,
        cache: new Map<string, T[]>()
    };
}

function live<T>(state: TypeaheadMachineState<T>): TypeaheadLive<T> {
    return state.status === 'disposed'
        ? {
            query: '',
            shown: [],
            stale: false,
            answered: false,
            error: '',
            attempt: 0,
            issued: 0,
            cache: new Map<string, T[]>()
        }
        : state;
}

function busy<T>(state: TypeaheadMachineState<T>): boolean {
    return state.status === 'debouncing' || state.status === 'loading';
}

export function transitionTypeaheadMachine<T>(
    state: TypeaheadMachineState<T>,
    event: TypeaheadMachineEvent<T>
): TypeaheadMachineTransition<T> {
    if (state.status === 'disposed') {
        return { state, effects: NONE };
    }
    if (event.type === 'disposed') {
        return {
            state: { status: 'disposed' },
            effects: busy(state) ? CANCEL : NONE
        };
    }

    if (event.type === 'input.changed') {
        const query = String(event.query ?? '');
        const minChars = Math.max(0, event.minChars);
        if (query.trim().length < minChars) {
            if (state.status === 'ready' && state.query === '' && !state.shown.length) {
                return { state, effects: NONE };
            }
            const attempt = state.issued + 1;
            return {
                state: {
                    ...live(state),
                    status: 'ready',
                    query: '',
                    shown: [],
                    stale: false,
                    answered: false,
                    error: '',
                    attempt,
                    issued: attempt
                },
                effects: busy(state) ? CANCEL : NONE
            };
        }
        if (query === state.query && state.status !== 'failed') {
            return { state, effects: NONE };
        }
        const base = live(state);
        const cached = base.cache.get(query);
        const attempt = base.issued + 1;
        if (cached) {
            return {
                state: {
                    ...base,
                    status: 'ready',
                    query,
                    shown: cached,
                    stale: false,
                    answered: true,
                    error: '',
                    attempt,
                    issued: attempt
                },
                effects: busy(state) ? CANCEL : NONE
            };
        }
        const stale = base.shown.length > 0;
        const pending = {
            ...base,
            query,
            shown: base.shown,
            stale,
            answered: base.answered,
            error: '',
            attempt,
            issued: attempt
        };
        if (event.delayMs > 0) {
            return {
                state: { ...pending, status: 'debouncing' },
                effects: [...(busy(state) ? CANCEL : NONE), { type: 'debounce', attempt, delayMs: event.delayMs }]
            };
        }
        return {
            state: { ...pending, status: 'loading' },
            effects: [...(busy(state) ? CANCEL : NONE), { type: 'request', attempt, query }]
        };
    }

    if (event.type === 'debounce.elapsed') {
        if (state.status !== 'debouncing' || state.attempt !== event.attempt) {
            return { state, effects: NONE };
        }
        return {
            state: { ...state, status: 'loading' },
            effects: [{ type: 'request', attempt: state.attempt, query: state.query }]
        };
    }

    if (event.type === 'request.succeeded' || event.type === 'request.failed' || event.type === 'request.timed-out') {
        if (state.status !== 'loading' || state.attempt !== event.attempt) {
            return { state, effects: NONE };
        }
        if (event.type === 'request.succeeded') {
            const items = Array.isArray(event.result?.items) ? event.result.items : [];
            const error = String(event.result?.error ?? '');
            const cache = new Map(state.cache);
            if (!error) {
                cache.set(state.query, items);
            }
            return {
                state: {
                    ...state,
                    status: error ? 'failed' : 'ready',
                    shown: items,
                    stale: false,
                    answered: true,
                    error,
                    cache
                },
                effects: CANCEL
            };
        }
        return {
            state: {
                ...state,
                status: 'failed',
                shown: [],
                stale: false,
                answered: true,
                error: event.type === 'request.timed-out' ? 'Request timed out' : event.message
            },
            effects: CANCEL
        };
    }

    if (event.type === 'retry.requested') {
        if (state.status !== 'failed') {
            return { state, effects: NONE };
        }
        const attempt = state.issued + 1;
        return {
            state: { ...state, status: 'loading', attempt, issued: attempt, error: '' },
            effects: [{ type: 'request', attempt, query: state.query }]
        };
    }

    return { state, effects: NONE };
}

export function typeaheadMachinePending<T>(state: TypeaheadMachineState<T>): boolean {
    return state.status === 'debouncing' || state.status === 'loading';
}

export function typeaheadMachineItems<T>(state: TypeaheadMachineState<T>): T[] {
    return state.status === 'disposed' ? [] : state.shown;
}

export function typeaheadMachineError<T>(state: TypeaheadMachineState<T>): string {
    return state.status === 'disposed' ? '' : state.error;
}

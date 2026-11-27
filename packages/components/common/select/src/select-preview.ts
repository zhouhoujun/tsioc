export type SelectPreviewState =
    | { readonly status: 'closed' }
    | { readonly status: 'idle' }
    | { readonly status: 'previewing'; readonly key: string }
    | { readonly status: 'committed' }
    | { readonly status: 'disposed' };

export type SelectPreviewEvent =
    | { readonly type: 'open.changed'; readonly open: boolean }
    | { readonly type: 'highlight.changed'; readonly key: string | undefined; readonly previewable: boolean }
    | { readonly type: 'option.selected'; readonly key: string | undefined; readonly closing: boolean }
    | { readonly type: 'disposed' };

export type SelectPreviewEffect =
    | { readonly type: 'preview.apply'; readonly key: string }
    | { readonly type: 'preview.revert' };

export interface SelectPreviewTransition {
    readonly state: SelectPreviewState;
    readonly effects: readonly SelectPreviewEffect[];
}

const CLOSED: SelectPreviewState = Object.freeze({ status: 'closed' });
const IDLE: SelectPreviewState = Object.freeze({ status: 'idle' });
const COMMITTED: SelectPreviewState = Object.freeze({ status: 'committed' });
const DISPOSED: SelectPreviewState = Object.freeze({ status: 'disposed' });
const NONE: readonly SelectPreviewEffect[] = Object.freeze([]);
const REVERT: readonly SelectPreviewEffect[] = Object.freeze([{ type: 'preview.revert' }]);

export function createSelectPreviewState(open = true): SelectPreviewState {
    return open ? IDLE : CLOSED;
}

/** Pure preview/undo state machine for select-like menus. */
export function transitionSelectPreview(
    state: SelectPreviewState,
    event: SelectPreviewEvent
): SelectPreviewTransition {
    if (state.status === 'disposed') {
        return { state, effects: NONE };
    }
    const previewing = state.status === 'previewing';
    if (event.type === 'disposed') {
        return { state: DISPOSED, effects: previewing ? REVERT : NONE };
    }
    if (event.type === 'open.changed') {
        if (event.open) {
            return { state: state.status === 'closed' || state.status === 'committed' ? IDLE : state, effects: NONE };
        }
        return { state: CLOSED, effects: previewing ? REVERT : NONE };
    }
    if (event.type === 'option.selected') {
        const effects = previewing && (event.key === undefined || state.key !== event.key) ? REVERT : NONE;
        if (!event.closing) {
            return { state: IDLE, effects };
        }
        return { state: state.status === 'closed' ? CLOSED : COMMITTED, effects };
    }
    if (state.status === 'closed' || state.status === 'committed') {
        return { state, effects: NONE };
    }
    if (!event.previewable || !event.key) {
        return previewing ? { state: IDLE, effects: REVERT } : { state, effects: NONE };
    }
    if (previewing && state.key === event.key) {
        return { state, effects: NONE };
    }
    return {
        state: { status: 'previewing', key: event.key },
        effects: [...(previewing ? REVERT : NONE), { type: 'preview.apply', key: event.key }]
    };
}

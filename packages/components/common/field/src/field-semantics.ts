export interface FieldAriaInput {
    /** Explicit inner control id; generated ids are supplied by the host widget. */
    controlId?: string;
    hint?: string;
    error?: string;
    hintId?: string;
    errorId?: string;
}

export interface FieldAria {
    controlId: string;
    hintId: string;
    errorId: string;
    invalid: boolean;
    /** Space-separated ids for the hint/error text; empty when absent. */
    describedBy: string;
}

/**
 * Shared field semantics for text fields, search fields and `ui-field-group`.
 * Keeps the `-hint` / `-error` id convention and `aria-describedby` ordering in
 * one place so every widget links the same nodes.
 */
export function resolveFieldAria(input: FieldAriaInput): FieldAria {
    const controlId = String(input.controlId ?? '');
    const hintId = String(input.hintId ?? '').trim() || (controlId ? `${controlId}-hint` : '');
    const errorId = String(input.errorId ?? '').trim() || (controlId ? `${controlId}-error` : '');
    const hint = String(input.hint ?? '');
    const error = String(input.error ?? '');
    return {
        controlId,
        hintId,
        errorId,
        invalid: !!error,
        describedBy: [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ')
    };
}

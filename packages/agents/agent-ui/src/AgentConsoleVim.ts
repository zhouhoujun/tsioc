export type ConsoleInputMode = 'insert' | 'normal';

export type ConsoleVimAction =
    | 'insert-mode'
    | 'insert-start'
    | 'insert-after'
    | 'insert-end'
    | 'newline-below'
    | 'newline-above'
    | 'history-prev'
    | 'history-next'
    | 'cursor-left'
    | 'cursor-right'
    | 'cursor-start'
    | 'cursor-end'
    | 'delete-char'
    | 'delete-line'
    | 'exit-insert';

export interface ConsoleVimKeyResolution {
    action?: string;
    pending?: string;
}

/**
 * Default vim-style bindings for the console input line.
 * `d` is a pending-prefix key: pressing `d` then `d` maps to `delete-line`.
 */
export const VIM_DEFAULT_BINDINGS: Record<string, ConsoleVimAction> = {
    i: 'insert-mode',
    I: 'insert-start',
    a: 'insert-after',
    A: 'insert-end',
    o: 'newline-below',
    O: 'newline-above',
    j: 'history-next',
    k: 'history-prev',
    h: 'cursor-left',
    l: 'cursor-right',
    '0': 'cursor-start',
    $: 'cursor-end',
    x: 'delete-char',
    d: 'delete-line'
};

export const VIM_ACTION_NAMES: ConsoleVimAction[] = [
    'insert-mode',
    'insert-start',
    'insert-after',
    'insert-end',
    'newline-below',
    'newline-above',
    'history-prev',
    'history-next',
    'cursor-left',
    'cursor-right',
    'cursor-start',
    'cursor-end',
    'delete-char',
    'delete-line',
    'exit-insert'
];

export const VIM_ACTION_LABELS: Record<string, string> = {
    'insert-mode': 'enter insert mode at cursor',
    'insert-start': 'enter insert mode at line start',
    'insert-after': 'enter insert mode after cursor',
    'insert-end': 'enter insert mode at line end',
    'newline-below': 'open a new line below and insert',
    'newline-above': 'open a new line above and insert',
    'history-prev': 'navigate to the previous input history entry',
    'history-next': 'navigate to the next input history entry',
    'cursor-left': 'move cursor left',
    'cursor-right': 'move cursor right',
    'cursor-start': 'move cursor to line start',
    'cursor-end': 'move cursor to line end',
    'delete-char': 'delete the character under the cursor',
    'delete-line': 'clear the whole input line',
    'exit-insert': 'leave insert mode back to normal mode'
};

export const VIM_PENDING_PREFIX_KEYS = new Set<string>(['d']);

export function isConsoleVimAction(value: string): boolean {
    return VIM_ACTION_NAMES.includes(value as ConsoleVimAction);
}

/**
 * Resolve a single normal-mode key against the effective bindings.
 * `pending` carries an in-flight prefix key (`d` for `dd` today); a pending key
 * press that is not completed resets the sequence and leaves the key unhandled.
 */
export function resolveConsoleVimKey(
    key: string,
    bindings: Record<string, string>,
    pending?: string
): ConsoleVimKeyResolution {
    if (pending) {
        if (key === pending) {
            const action = bindings[pending];
            return { action, pending: undefined };
        }
        return { pending: undefined };
    }
    const action = bindings[key];
    if (!action) {
        return {};
    }
    if (VIM_PENDING_PREFIX_KEYS.has(key)) {
        return { pending: key };
    }
    return { action };
}

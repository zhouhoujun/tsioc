/**
 * Composer editing actions shared by decoded terminal keys and (future) hosts.
 *
 * Kept out of `AgentConsoleTerminalInputController` so the controller stays a
 * thin dispatcher and within its source-size budget.
 */
export interface AgentConsoleComposerEditingHost {
    state: {
        moveInputCursor(delta: number): void;
        moveInputCursorToEdge(position: 'start' | 'end'): void;
        moveInputCursorByWord(delta: number): void;
        deleteInputWord(direction: -1 | 1): void;
        killInputToEdge(edge: 'start' | 'end'): void;
    };
}

/** Returns true when the action was a composer editing action and was handled. */
export function handleComposerEditingAction(
    host: AgentConsoleComposerEditingHost,
    action: string | undefined,
    value: string | undefined
): boolean {
    switch (action) {
        case 'draftNavigation':
            switch (value) {
                case 'left':
                    host.state.moveInputCursor(-1);
                    return true;
                case 'right':
                    host.state.moveInputCursor(1);
                    return true;
                case 'home':
                case 'start':
                    host.state.moveInputCursorToEdge('start');
                    return true;
                case 'end':
                    host.state.moveInputCursorToEdge('end');
                    return true;
                default:
                    return true;
            }
        case 'wordNavigation':
            host.state.moveInputCursorByWord(value === 'word-left' ? -1 : 1);
            return true;
        case 'deleteWord':
            host.state.deleteInputWord(value === 'delete-word-left' ? -1 : 1);
            return true;
        case 'killLine':
            host.state.killInputToEdge(value === 'start' ? 'start' : 'end');
            return true;
        default:
            return false;
    }
}

/**
 * Host-adapter notices (CLI/TUI launcher, desktop, IDE).
 *
 * A host only holds the started application context, so it naturally reaches
 * for `ctx.get(AgentConsoleSessionState).setNotice(...)`. That writes the **raw**
 * state singleton: the reactive proxy that views depend on never sees the write
 * and the notice stays invisible until some unrelated state change repaints the
 * status area (the approvals-endpoint notice failed exactly this way).
 *
 * Writing through the console component's public `sessionState` getter keeps
 * the reactive write path: the component instance is wrapped in `reactive()`,
 * so the getter returns a proxy whose `setNotice` triggers the bound views.
 */

export interface AgentConsoleHostNoticeTarget {
    sessionState?: { setNotice(message: string): void } | null;
}

/**
 * Set a host-side notice on the running console.
 *
 * @returns `true` when the component state accepted the notice (so the caller
 *          does not need its own fallback).
 */
export function setHostConsoleNotice(
    target: AgentConsoleHostNoticeTarget | null | undefined,
    message: string
): boolean {
    const state = target?.sessionState;
    if (!state || typeof state.setNotice !== 'function') {
        return false;
    }
    state.setNotice(message);
    return true;
}

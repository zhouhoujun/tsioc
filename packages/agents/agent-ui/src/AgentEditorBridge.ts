import { token } from '@tsdi/ioc';

/**
 * P129 (G53): external editor bridge.
 *
 * The UI layer only defines the contract. A platform host (agent-cli) provides
 * the implementation that spawns $EDITOR/$VISUAL with a temporary file and
 * reads the result back. Browser / web-console hosts simply leave the bridge
 * unregistered, in which case `available` is false and the `/editor` command
 * and `Ctrl+G` key action report the missing host instead of failing.
 */
export interface AgentEditorResult {
    /** Final editor buffer content. */
    content?: string;
    /** True when the user aborted without saving (non-zero editor exit or empty diff). */
    cancelled?: boolean;
}

export interface AgentEditorBridge {
    readonly available: boolean;
    /**
     * Open an external editor seeded with `initial`. Resolves when the editor
     * exits with the edited content. Never throws for user-facing outcomes:
     * editor-not-found, spawn failure, or timeout are reported via the result.
     */
    open(initial: string): Promise<AgentEditorResult>;
}

export const AGENT_EDITOR_BRIDGE = token<AgentEditorBridge>('AGENT_EDITOR_BRIDGE');

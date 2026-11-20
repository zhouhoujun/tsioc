import type { AgentRuntime, AgentTurnUndoResult } from '@tsdi/agent';
import { requireSessionId } from './request-helpers';

interface TurnUndoHost {
    runtime: AgentRuntime;
    ensureSessionAccess(sessionId: string, context: any): Promise<void>;
}

/** `session.undo_turn`: revert the latest prompt, its messages and file changes. */
export async function undoSessionTurn(host: TurnUndoHost, params: any, context: any): Promise<AgentTurnUndoResult> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    return host.runtime.undoTurn(sessionId);
}

/** `session.redo_turn`: re-apply the last undone turn. */
export async function redoSessionTurn(host: TurnUndoHost, params: any, context: any): Promise<AgentTurnUndoResult> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    return host.runtime.redoTurn(sessionId);
}

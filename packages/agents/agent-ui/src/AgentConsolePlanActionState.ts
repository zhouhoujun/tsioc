import type {
    AgentConsolePlanActionKind,
    AgentConsolePlanTodoItem,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';

export async function retrySelectedPlanTodo(state: AgentConsoleSessionState): Promise<boolean> {
    const item = state.selectedPlanTodo;
    if (!item || item.status !== 'failed') return false;
    state.planTodos = state.planTodos.map(todo => todo.id === item.id
        ? { ...todo, status: 'pending', error: undefined, blockedBy: undefined, elapsedMs: undefined }
        : todo);
    state.planMessage = state.buildPlanMessage();
    await state.retrySelectedPlanTodoAction?.(item);
    return true;
}

export function isPlanActionApplicable(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): boolean {
    switch (action) {
        case 'complete':
            return item.status === 'pending' || item.status === 'in_progress';
        case 'retry':
            return item.status === 'failed' || item.status === 'cancelled';
        case 'block':
            return item.status !== 'completed' && item.status !== 'cancelled'
                && !(item.blockedBy && item.blockedBy.length > 0);
        case 'unblock':
            return !!(item.blockedBy && item.blockedBy.length > 0) || !!item.blockedReason;
        case 'assign':
            return item.status !== 'completed' && item.status !== 'cancelled';
        default:
            return false;
    }
}

export function requestPlanAction(
    state: AgentConsoleSessionState,
    action: AgentConsolePlanActionKind,
    stepId: string,
    payload?: Record<string, unknown>
): boolean {
    const item = state.planTodos.find(todo => todo.id === stepId);
    if (!item || !isPlanActionApplicable(action, item)) {
        return false;
    }
    if (action === 'retry') {
        const previous = applyPlanActionOptimistically(state, action, item, payload);
        void dispatchPlanAction(state, action, stepId, payload)
            .then(ok => { if (!ok) rollbackPlanAction(state, stepId, previous); })
            .catch(() => rollbackPlanAction(state, stepId, previous));
        return true;
    }
    state.planActionPrompt = {
        action,
        stepId,
        label: planActionPromptLabel(action, item),
        confirmLabel: action === 'block' ? 'Block' : action === 'unblock' ? 'Unblock' : action === 'assign' ? 'Assign' : 'Complete',
        denyLabel: 'Cancel',
        payload
    };
    return true;
}

export function planActionPromptLabel(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): string {
    const whom = item.content ? `'${String(item.content).slice(0, 40)}'` : `step ${item.id}`;
    switch (action) {
        case 'complete': return `Mark ${whom} as complete?`;
        case 'block': return `Block ${whom}?`;
        case 'unblock': return `Unblock ${whom}?`;
        case 'assign': return `Assign ${whom}?`;
        default: return `Apply action to ${whom}?`;
    }
}

export function dismissPlanAction(state: AgentConsoleSessionState): void {
    state.planActionPrompt = null;
}

export function confirmPlanAction(state: AgentConsoleSessionState): boolean {
    const prompt = state.planActionPrompt;
    if (!prompt) return false;
    const item = state.planTodos.find(todo => todo.id === prompt.stepId);
    if (!item) {
        state.planActionPrompt = null;
        return false;
    }
    const previous = applyPlanActionOptimistically(state, prompt.action, item, prompt.payload);
    state.planActionPrompt = null;
    void dispatchPlanAction(state, prompt.action, prompt.stepId, prompt.payload)
        .then(ok => { if (!ok) rollbackPlanAction(state, prompt.stepId, previous); })
        .catch(() => rollbackPlanAction(state, prompt.stepId, previous));
    return true;
}

export function applyPlanActionOptimistically(
    state: AgentConsoleSessionState,
    action: AgentConsolePlanActionKind,
    item: AgentConsolePlanTodoItem,
    payload?: Record<string, unknown>
): AgentConsolePlanTodoItem {
    state.planActionApplying = true;
    const next: AgentConsolePlanTodoItem = { ...item, updatedAt: Date.now() };
    switch (action) {
        case 'complete':
            next.status = 'completed';
            break;
        case 'retry':
            next.status = 'pending';
            next.error = undefined;
            next.blockedBy = undefined;
            next.blockedReason = undefined;
            next.elapsedMs = undefined;
            break;
        case 'block': {
            const reason = typeof payload?.reason === 'string' ? payload.reason : 'blocked by user';
            next.status = next.status === 'failed' ? 'pending' : next.status;
            next.blockedReason = reason;
            next.blockedBy = [...(next.blockedBy ?? []), next.id];
            break;
        }
        case 'unblock':
            next.blockedBy = undefined;
            next.blockedReason = undefined;
            break;
        case 'assign':
            next.owner = typeof payload?.owner === 'string' ? payload.owner : next.owner;
            break;
        default:
            break;
    }
    state.planTodos = state.planTodos.map(todo => todo.id === item.id ? next : todo);
    state.planMessage = state.buildPlanMessage();
    return item;
}

export function rollbackPlanAction(
    state: AgentConsoleSessionState,
    stepId: string,
    previous: AgentConsolePlanTodoItem | null
): void {
    state.planActionApplying = false;
    if (!previous) return;
    state.planTodos = state.planTodos.map(todo => todo.id === stepId ? previous : todo);
    state.planMessage = state.buildPlanMessage();
}

export async function dispatchPlanAction(
    state: AgentConsoleSessionState,
    action: AgentConsolePlanActionKind,
    stepId: string,
    payload?: Record<string, unknown>
): Promise<boolean> {
    if (state.planActionBus) {
        const ok = await state.planActionBus(action, stepId, payload);
        if (ok) {
            state.planActionApplying = false;
        }
        return ok;
    }
    if (action === 'retry') {
        const item = state.planTodos.find(todo => todo.id === stepId);
        if (item) {
            await state.retrySelectedPlanTodoAction?.(item);
        }
        state.planActionApplying = false;
        return true;
    }
    state.planActionApplying = false;
    return true;
}

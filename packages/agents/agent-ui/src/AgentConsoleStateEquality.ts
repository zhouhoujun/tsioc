import type {
    AgentConsoleApprovalRequest,
    AgentConsolePlanTodoItem,
    AgentConsoleSessionItem,
    AgentConsoleToolItem
} from './AgentConsoleStateTypes';

/**
 * Cheap content equality for reactive list state.
 *
 * List setters used by tab switches and background refreshes run repeatedly
 * with freshly-built arrays. Assigning an equal array still triggers every
 * bound panel and a full render, so a cached tab switch paid for extra frames
 * even though nothing changed. These helpers compare content and let the
 * setter keep the existing array when the refresh is a no-op.
 */
function samePrimitiveList(left: readonly unknown[] | undefined, right: readonly unknown[] | undefined): boolean {
    if (left === right) {
        return true;
    }
    const a = left || [];
    const b = right || [];
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== b[index]) {
            return false;
        }
    }
    return true;
}

export function sameAgentConsoleStringList(left: readonly string[] | undefined, right: readonly string[] | undefined): boolean {
    return samePrimitiveList(left, right);
}

function sessionSignature(session: AgentConsoleSessionItem): string {
    return [
        session?.id, session?.current ? 1 : 0, session?.workspace, session?.updatedAt,
        session?.messageCount, session?.summary, session?.title, session?.pinned ? 1 : 0,
        session?.archived ? 1 : 0, session?.projectKey, session?.projectId,
        session?.primaryThreadId, session?.originThreadId, session?.sessionRole,
        session?.rootRequest, session?.focusSummary, session?.projectLabel,
        session?.projectSessionCount,
        session?.sections ? JSON.stringify(session.sections) : ''
    ].join('\u0000');
}

export function sameAgentConsoleSessions(
    left: readonly AgentConsoleSessionItem[] | undefined,
    right: readonly AgentConsoleSessionItem[] | undefined
): boolean {
    if (left === right) {
        return true;
    }
    const a = left || [];
    const b = right || [];
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] === b[index]) {
            continue;
        }
        if (sessionSignature(a[index]) !== sessionSignature(b[index])) {
            return false;
        }
    }
    return true;
}

function toolSignature(tool: AgentConsoleToolItem): string {
    return [tool?.name, tool?.toolset, tool?.active ? 1 : 0, tool?.activationKind].join('\u0000');
}

export function sameAgentConsoleTools(
    left: readonly AgentConsoleToolItem[] | undefined,
    right: readonly AgentConsoleToolItem[] | undefined
): boolean {
    if (left === right) {
        return true;
    }
    const a = left || [];
    const b = right || [];
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] === b[index]) {
            continue;
        }
        if (toolSignature(a[index]) !== toolSignature(b[index])) {
            return false;
        }
    }
    return true;
}

function todoSignature(todo: AgentConsolePlanTodoItem): string {
    return [
        todo?.id, todo?.content, todo?.status, todo?.parentId, todo?.kind,
        todo?.acceptance, todo?.owner, todo?.error, todo?.elapsedMs, todo?.updatedAt,
        todo?.planId, todo?.revision, todo?.blockedReason, todo?.receiptId,
        todo?.testSummary, todo?.diffSummary,
        todo?.dependsOn ? JSON.stringify(todo.dependsOn) : '',
        todo?.blockedBy ? JSON.stringify(todo.blockedBy) : '',
        todo?.evidenceIds ? JSON.stringify(todo.evidenceIds) : ''
    ].join('\u0000');
}

export function sameAgentConsolePlanTodos(
    left: readonly AgentConsolePlanTodoItem[] | undefined,
    right: readonly AgentConsolePlanTodoItem[] | undefined
): boolean {
    if (left === right) {
        return true;
    }
    const a = left || [];
    const b = right || [];
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] === b[index]) {
            continue;
        }
        if (todoSignature(a[index]) !== todoSignature(b[index])) {
            return false;
        }
    }
    return true;
}

function approvalSignature(request: AgentConsoleApprovalRequest): string {
    return [
        request?.id, request?.toolName, request?.sessionId, request?.reason,
        request?.summary, request?.hasInput ? 1 : 0, request?.inputSummary,
        request?.createdAt, request?.timeoutMs, request?.expiresAt,
        request?.reasonDetail ? `${request.reasonDetail.code}:${JSON.stringify(request.reasonDetail.params || null)}` : ''
    ].join('\u0000');
}

export function sameAgentConsoleApprovals(
    left: readonly AgentConsoleApprovalRequest[] | undefined,
    right: readonly AgentConsoleApprovalRequest[] | undefined
): boolean {
    if (left === right) {
        return true;
    }
    const a = left || [];
    const b = right || [];
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] === b[index]) {
            continue;
        }
        if (approvalSignature(a[index]) !== approvalSignature(b[index])) {
            return false;
        }
    }
    return true;
}

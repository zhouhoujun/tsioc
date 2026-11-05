import type { AgentConsoleActivity, AgentConsoleApprovalRequest, AgentConsoleToolRun } from './AgentConsoleStateTypes';

export interface AgentConsoleExecutionState {
    pendingApprovals: AgentConsoleApprovalRequest[];
    selectedApprovalId: string;
    approvalsFocused: boolean;
    activeToolSet: Set<string>;
    runningTools: string[];
    toolRuns: AgentConsoleToolRun[];
    selectedToolRunIndex: number;
    activities: AgentConsoleActivity[];
    consoleOptions: { activityHistoryLimit: number; storedToolRunsLimit: number };
    syncDerivedInputFocus(): void;
}

export function setPendingApprovalsInState(state: AgentConsoleExecutionState, requests: AgentConsoleApprovalRequest[]): void {
    state.pendingApprovals = requests
        .slice()
        .sort((left, right) => left.createdAt - right.createdAt);
    if (!state.pendingApprovals.length) {
        state.selectedApprovalId = '';
        state.approvalsFocused = false;
    } else if (state.selectedApprovalId && state.pendingApprovals.some(item => item.id === state.selectedApprovalId)) {
        // Preserve explicit approval selection when possible.
    } else {
        state.selectedApprovalId = state.pendingApprovals[0].id;
    }
    state.syncDerivedInputFocus();
}

export function upsertPendingApprovalInState(state: AgentConsoleExecutionState, request: AgentConsoleApprovalRequest): void {
    // The same request can arrive twice (in-process event bridge plus the
    // streamed RPC chunk). The first arrival owns the identity details, so
    // a sparse duplicate must not erase the reason/input/timing of an
    // already known request.
    const existing = state.pendingApprovals.find(item => item.id === request.id);
    const merged = existing ? {
        ...existing,
        ...request,
        reason: existing.reason || request.reason,
        reasonDetail: existing.reasonDetail || request.reasonDetail,
        summary: existing.summary || request.summary,
        inputSummary: existing.inputSummary || request.inputSummary,
        createdAt: existing.createdAt || request.createdAt,
        timeoutMs: existing.timeoutMs || request.timeoutMs,
        expiresAt: existing.expiresAt || request.expiresAt
    } : request;
    const next = state.pendingApprovals.filter(item => item.id !== request.id);
    next.push(merged);
    state.pendingApprovals = next.sort((left, right) => left.createdAt - right.createdAt);
    if (!state.pendingApprovals.length) {
        state.selectedApprovalId = '';
        state.approvalsFocused = false;
    } else if (!state.pendingApprovals.some(item => item.id === state.selectedApprovalId)) {
        state.selectedApprovalId = state.pendingApprovals[0].id;
    }
    state.syncDerivedInputFocus();
}

export function removePendingApprovalInState(state: AgentConsoleExecutionState, requestId: string): void {
    const next = state.pendingApprovals.filter(item => item.id !== requestId);
    if (next.length === state.pendingApprovals.length) {
        return;
    }
    state.pendingApprovals = next;
    if (!state.pendingApprovals.length) {
        state.selectedApprovalId = '';
        state.approvalsFocused = false;
    } else if (!state.pendingApprovals.some(item => item.id === state.selectedApprovalId)) {
        state.selectedApprovalId = state.pendingApprovals[0].id;
    }
    state.syncDerivedInputFocus();
}

export function setRunningToolInState(state: AgentConsoleExecutionState, toolName: string): void {
    state.activeToolSet.add(toolName);
    state.runningTools = Array.from(state.activeToolSet.values()).sort();
}

export function clearRunningToolInState(state: AgentConsoleExecutionState, toolName: string): void {
    state.activeToolSet.delete(toolName);
    state.runningTools = Array.from(state.activeToolSet.values()).sort();
}

export function clearToolActivityInState(state: AgentConsoleExecutionState): void {
    if (!state.activeToolSet.size && !state.runningTools.length && !state.toolRuns.length) {
        return;
    }
    state.activeToolSet.clear();
    state.runningTools = [];
    state.toolRuns = [];
}

export function pushActivityInState(state: AgentConsoleExecutionState, kind: AgentConsoleActivity['kind'], message: string): void {
    const normalizedMessage = String(message || '').trim();
    const lastActivity = state.activities[state.activities.length - 1];
    if (normalizedMessage && lastActivity?.kind === kind && lastActivity.message === normalizedMessage) {
        return;
    }
    state.activities = [
        ...state.activities.slice(-(state.consoleOptions.activityHistoryLimit - 1)),
        {
            id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            kind,
            message: normalizedMessage,
            createdAt: Date.now()
        }
    ];
}

export function upsertToolRunInState(state: AgentConsoleExecutionState, run: AgentConsoleToolRun): void {
    const next = state.toolRuns.filter(item => item.name !== run.name);
    next.unshift(run);
    state.toolRuns = next.slice(0, state.consoleOptions.storedToolRunsLimit);
    state.selectedToolRunIndex = Math.max(0, Math.min(state.selectedToolRunIndex, state.toolRuns.length - 1));
}

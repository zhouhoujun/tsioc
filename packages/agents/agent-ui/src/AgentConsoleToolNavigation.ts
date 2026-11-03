import type {
    AgentConsoleApprovalRequest,
    AgentConsoleSessionState,
    AgentConsoleToolItem,
    AgentConsoleToolRun
} from './AgentConsoleSessionState';

export function setToolsFocused(state: AgentConsoleSessionState, focused: boolean): void {
    state.toolsFocused = focused;
    if (focused && !state.selectedToolName && state.tools.length) {
        state.selectedToolName = state.tools[0].name;
    }
    state.syncDerivedInputFocus();
}

export function setSelectedToolName(state: AgentConsoleSessionState, toolName: string): void {
    if (!toolName || !state.tools.some(item => item.name === toolName)) {
        return;
    }
    state.selectedToolName = toolName;
}

export function moveToolSelection(state: AgentConsoleSessionState, delta: number): void {
    if (!state.tools.length) {
        return;
    }
    const currentIndex = Math.max(0, state.tools.findIndex(item => item.name === state.selectedToolName));
    const nextIndex = (currentIndex + delta + state.tools.length) % state.tools.length;
    state.selectedToolName = state.tools[nextIndex].name;
}

export function moveToolSelectionPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
    if (!state.tools.length) {
        return;
    }
    const currentIndex = Math.max(0, state.tools.findIndex(item => item.name === state.selectedToolName));
    const resolvedPageSize = pageSize ?? state.consoleOptions.toolSelectionPageSize;
    const nextIndex = Math.max(0, Math.min(state.tools.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
    state.selectedToolName = state.tools[nextIndex].name;
}

export function selectFirstTool(state: AgentConsoleSessionState): void {
    if (!state.tools.length) {
        return;
    }
    state.selectedToolName = state.tools[0].name;
}

export function selectLastTool(state: AgentConsoleSessionState): void {
    if (!state.tools.length) {
        return;
    }
    state.selectedToolName = state.tools[state.tools.length - 1].name;
}

export function resolveSelectedTool(state: AgentConsoleSessionState): AgentConsoleToolItem | undefined {
    return state.tools.find(item => item.name === state.selectedToolName);
}

export function moveToolRunSelection(state: AgentConsoleSessionState, delta: number): void {
    if (!state.toolRuns.length) {
        return;
    }
    const nextIndex = (state.selectedToolRunIndex + delta + state.toolRuns.length) % state.toolRuns.length;
    state.selectedToolRunIndex = Math.max(0, Math.min(state.toolRuns.length - 1, nextIndex));
}

export function moveToolRunSelectionPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
    if (!state.toolRuns.length) {
        return;
    }
    const resolvedPageSize = pageSize ?? state.consoleOptions.toolSelectionPageSize;
    const nextIndex = state.selectedToolRunIndex + (delta * Math.max(1, resolvedPageSize));
    state.selectedToolRunIndex = Math.max(0, Math.min(state.toolRuns.length - 1, nextIndex));
}

export function selectFirstToolRun(state: AgentConsoleSessionState): void {
    if (!state.toolRuns.length) {
        return;
    }
    state.selectedToolRunIndex = 0;
}

export function selectLastToolRun(state: AgentConsoleSessionState): void {
    if (!state.toolRuns.length) {
        return;
    }
    state.selectedToolRunIndex = state.toolRuns.length - 1;
}

export function resolveSelectedToolRun(state: AgentConsoleSessionState): AgentConsoleToolRun | undefined {
    return state.toolRuns[state.selectedToolRunIndex];
}

export function setApprovalsFocused(state: AgentConsoleSessionState, focused: boolean): void {
    state.approvalsFocused = focused;
    if (focused && !state.selectedApprovalId && state.pendingApprovals.length) {
        state.selectedApprovalId = state.pendingApprovals[0].id;
    }
    state.syncDerivedInputFocus();
}

export function requestApprovalAttention(state: AgentConsoleSessionState): void {
    if (!state.pendingApprovals.length) {
        return;
    }
    if (state.pendingQuestion
        || state.focusLayers.hasBlockingSelectMenu()
        || state.textOverlay
        || state.reviewOpen
        || state.timelineEventInspectorOpen
        || state.messageDetailOpen) {
        return;
    }
    if (!state.approvalsFocused) {
        setApprovalsFocused(state, true);
    }
}

export function setSelectedApprovalId(state: AgentConsoleSessionState, approvalId: string): void {
    if (!approvalId || !state.pendingApprovals.some(item => item.id === approvalId)) {
        return;
    }
    state.selectedApprovalId = approvalId;
}

export function moveApprovalSelection(state: AgentConsoleSessionState, delta: number): void {
    if (!state.pendingApprovals.length) {
        return;
    }
    const currentIndex = Math.max(0, state.pendingApprovals.findIndex(item => item.id === state.selectedApprovalId));
    const nextIndex = (currentIndex + delta + state.pendingApprovals.length) % state.pendingApprovals.length;
    state.selectedApprovalId = state.pendingApprovals[nextIndex].id;
}

export function moveApprovalSelectionPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
    if (!state.pendingApprovals.length) {
        return;
    }
    const currentIndex = Math.max(0, state.pendingApprovals.findIndex(item => item.id === state.selectedApprovalId));
    const resolvedPageSize = pageSize ?? state.consoleOptions.approvalSelectionPageSize;
    const nextIndex = Math.max(0, Math.min(state.pendingApprovals.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
    state.selectedApprovalId = state.pendingApprovals[nextIndex].id;
}

export function selectFirstApproval(state: AgentConsoleSessionState): void {
    if (!state.pendingApprovals.length) {
        return;
    }
    state.selectedApprovalId = state.pendingApprovals[0].id;
}

export function selectLastApproval(state: AgentConsoleSessionState): void {
    if (!state.pendingApprovals.length) {
        return;
    }
    state.selectedApprovalId = state.pendingApprovals[state.pendingApprovals.length - 1].id;
}

export function resolveSelectedApproval(state: AgentConsoleSessionState): AgentConsoleApprovalRequest | undefined {
    return state.pendingApprovals.find(item => item.id === state.selectedApprovalId);
}

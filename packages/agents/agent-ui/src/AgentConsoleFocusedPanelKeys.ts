import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    focusSelectedTaskLineageFilter as focusSelectedTaskLineageFilterInState,
    moveTaskSelection as moveTaskSelectionInState,
    moveTaskSelectionPage as moveTaskSelectionPageInState,
    selectFirstTask as selectFirstTaskInState,
    selectLastTask as selectLastTaskInState,
    setTaskFilter as setTaskFilterInState
} from './AgentConsoleReviewTaskState';

export async function handleTasksFocusedKey(
    state: AgentConsoleSessionState,
    key: string,
    navigation: AgentConsoleTranscriptNavigationController
): Promise<boolean> {
    const normalized = key;
            if ((normalized === 'esc' || normalized === 'escape') && state.canCancelFocusedCodingTask()) {
                await state.cancelFocusedCodingTask();
                return true;
            }
            if (state.focusLayers.isDismissKey(normalized)) {
                await state.focusLayers.dismiss(navigation);
                return true;
            }
            if (state.hasActivePlanTodos()) {
                switch (normalized) {
                    case 'up':
                        state.movePlanTodoSelection(-1);
                        return true;
                    case 'down':
                        state.movePlanTodoSelection(1);
                        return true;
                    case 'home':
                        state.selectedPlanTodoIndex = 0;
                        return true;
                    case 'end': {
                        const filtered = state.filteredPlanTodos;
                        state.selectedPlanTodoIndex = filtered.length > 0 ? filtered.length - 1 : -1;
                        return true;
                    }
                    case 'pageup': {
                        const pfUp = state.filteredPlanTodos;
                        state.selectedPlanTodoIndex = pfUp.length > 0 ? 0 : -1;
                        return true;
                    }
                    case 'pagedown': {
                        const pfDown = state.filteredPlanTodos;
                        state.selectedPlanTodoIndex = pfDown.length > 0 ? pfDown.length - 1 : -1;
                        return true;
                    }
                    case 'f': {
                        const cycle: Array<'all' | 'active' | 'blocked' | 'failed'> = ['all', 'active', 'blocked', 'failed'];
                        const next = cycle[(cycle.indexOf(state.planTodoFilter) + 1) % cycle.length];
                        state.setPlanTodoFilter(next);
                        return true;
                    }
                    case 'j':
                        state.jumpToNextBlockedPlanTodo();
                        return true;
                    case 'k':
                        state.jumpToNextFailedPlanTodo();
                        return true;
                    case 'enter':
                        state.planTodoExpanded = !state.planTodoExpanded;
                        return true;
                    case 'e':
                        state.planTodoExpanded = !state.planTodoExpanded;
                        return true;
                    case 'r':
                        return state.retrySelectedPlanTodo();
                }
            }
            switch (normalized) {
                case 'copy':
                    await state.copyFocusedTextAction?.(state.buildSelectedTaskCopyText(), state.translateLabel('agent.notice.copyLabelSelectedTask', undefined, 'selected task'));
                    return true;
                case 'enter':
                    if (state.selectedTask?.id) {
                        await state.openSelectedTaskAction?.(state.selectedTask.id);
                        return true;
                    }
                    return false;
                case 'r':
                    if (state.canRetryFocusedCodingTask()) {
                        await state.retryFocusedCodingTask();
                        return true;
                    }
                    return false;
                case 'x':
                    if (state.selectedTask?.id) {
                        await state.cancelSelectedTaskAction?.(state.selectedTask.id);
                        return true;
                    }
                    return false;
                case 'b':
                    if (state.selectedTask?.id) {
                        await state.rollbackSelectedTaskAction?.(state.selectedTask.id);
                        return true;
                    }
                    return false;
                case 'l':
                    return focusSelectedTaskLineageFilterInState(state);
                case 'f':
                    setTaskFilterInState(state, 'failed');
                    return true;
                case 'v':
                    setTaskFilterInState(state, 'rollback');
                    return true;
                case 'u':
                    setTaskFilterInState(state, 'all');
                    return true;
                case 'down':
                    moveTaskSelectionInState(state, 1);
                    return true;
                case 'up':
                    moveTaskSelectionInState(state, -1);
                    return true;
                case 'pageup':
                    moveTaskSelectionPageInState(state, -1);
                    return true;
                case 'pagedown':
                    moveTaskSelectionPageInState(state, 1);
                    return true;
                case 'home':
                    selectFirstTaskInState(state);
                    return true;
                case 'end':
                    selectLastTaskInState(state);
                    return true;
                default:
                    return false;
            }
}

export async function handleJobsFocusedKey(
    state: AgentConsoleSessionState,
    key: string,
    navigation: AgentConsoleTranscriptNavigationController
): Promise<boolean> {
    const normalized = key;
            if (state.focusLayers.isDismissKey(normalized)) {
                await state.focusLayers.dismiss(navigation);
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await state.copyFocusedTextAction?.(state.buildSelectedScheduledTaskCopyText(), state.translateLabel('agent.notice.copyLabelScheduledJob', undefined, 'scheduled job'));
                    return true;
                case 'enter':
                case 'p':
                    if (state.selectedScheduledTask?.id) {
                        await state.toggleSelectedScheduledTaskAction?.(state.selectedScheduledTask.id);
                        return true;
                    }
                    return false;
                case 'x':
                    if (state.selectedScheduledTask?.id) {
                        await state.cancelSelectedScheduledTaskAction?.(state.selectedScheduledTask.id);
                        return true;
                    }
                    return false;
                case 'r':
                    if (state.selectedScheduledTask?.id) {
                        await state.recoverSelectedScheduledTaskAction?.(state.selectedScheduledTask.id);
                        return true;
                    }
                    return false;
                case 'down':
                    state.moveScheduledTaskSelection(1);
                    return true;
                case 'up':
                    state.moveScheduledTaskSelection(-1);
                    return true;
                case 'pageup':
                    state.moveScheduledTaskSelectionPage(-1);
                    return true;
                case 'pagedown':
                    state.moveScheduledTaskSelectionPage(1);
                    return true;
                case 'home':
                    state.selectFirstScheduledTask();
                    return true;
                case 'end':
                    state.selectLastScheduledTask();
                    return true;
                default:
                    return false;
            }
}

export async function handleToolsFocusedKey(
    state: AgentConsoleSessionState,
    key: string,
    navigation: AgentConsoleTranscriptNavigationController
): Promise<boolean> {
    const normalized = key;
            if (state.focusLayers.isDismissKey(normalized)) {
                await state.focusLayers.dismiss(navigation);
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await state.copyFocusedTextAction?.(state.selectedTool?.name || '', state.translateLabel('agent.notice.copyLabelToolName', undefined, 'tool name'));
                    return true;
                case 'enter':
                case 'approve':
                    if (state.selectedTool?.name) {
                        await state.activateSelectedToolAction?.(state.selectedTool.name);
                        return true;
                    }
                    return false;
                case 'down':
                    state.moveToolSelection(1);
                    return true;
                case 'up':
                    state.moveToolSelection(-1);
                    return true;
                case 'pageup':
                    state.moveToolSelectionPage(-1);
                    return true;
                case 'pagedown':
                    state.moveToolSelectionPage(1);
                    return true;
                case 'home':
                    state.selectFirstTool();
                    return true;
                case 'end':
                    state.selectLastTool();
                    return true;
                default:
                    return false;
            }
}

export async function handleToolRunsFocusedKey(
    state: AgentConsoleSessionState,
    key: string,
    navigation: AgentConsoleTranscriptNavigationController
): Promise<boolean> {
    const normalized = key;
            if (state.focusLayers.isDismissKey(normalized)) {
                await state.focusLayers.dismiss(navigation);
                return true;
            }
            switch (normalized) {
                case 'copy':
                    await state.copyFocusedTextAction?.(state.buildSelectedToolRunCopyText(), state.translateLabel('agent.notice.copyLabelToolRun', undefined, 'tool run'));
                    return true;
                case 'down':
                    state.moveToolRunSelection(1);
                    return true;
                case 'up':
                    state.moveToolRunSelection(-1);
                    return true;
                case 'pageup':
                    state.moveToolRunSelectionPage(-1);
                    return true;
                case 'pagedown':
                    state.moveToolRunSelectionPage(1);
                    return true;
                case 'home':
                    state.selectFirstToolRun();
                    return true;
                case 'end':
                    state.selectLastToolRun();
                    return true;
                default:
                    return false;
            }
}

import type {
    AgentConsoleApprovalRequest,
    AgentConsoleReviewTaskItem,
    AgentConsoleToolItem,
    AgentConsoleToolRun
} from './AgentConsoleStateTypes';
import { AgentConsoleSessionPlanningHost } from './AgentConsoleSessionPlanningHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    buildSelectedScheduledTaskCopyText as buildSelectedScheduledTaskCopyTextInState,
    formatScheduledTimestamp as formatScheduledTimestampInState
} from './AgentConsoleSessionNavigation';
import {
    resolveFilteredReviewTaskChoices,
    resolveSelectedTask,
    setSelectedReviewTaskId as setSelectedReviewTaskIdInState,
    setTasksFocused as setTasksFocusedInState
} from './AgentConsoleReviewTaskState';
import {
    moveApprovalSelection as moveApprovalSelectionInState,
    moveApprovalSelectionPage as moveApprovalSelectionPageInState,
    moveToolRunSelection as moveToolRunSelectionInState,
    moveToolRunSelectionPage as moveToolRunSelectionPageInState,
    moveToolSelection as moveToolSelectionInState,
    moveToolSelectionPage as moveToolSelectionPageInState,
    requestApprovalAttention as requestApprovalAttentionInState,
    resolveSelectedApproval,
    resolveSelectedTool,
    resolveSelectedToolRun,
    selectFirstApproval as selectFirstApprovalInState,
    selectFirstTool as selectFirstToolInState,
    selectFirstToolRun as selectFirstToolRunInState,
    selectLastApproval as selectLastApprovalInState,
    selectLastTool as selectLastToolInState,
    selectLastToolRun as selectLastToolRunInState,
    setApprovalsFocused as setApprovalsFocusedInState,
    setSelectedApprovalId as setSelectedApprovalIdInState,
    setSelectedToolName as setSelectedToolNameInState,
    setToolsFocused as setToolsFocusedInState
} from './AgentConsoleToolNavigation';

/** Task, tool and approval selection facade split from the session state. */
export abstract class AgentConsoleSessionSelectionHost extends AgentConsoleSessionPlanningHost {
    protected abstract self(): AgentConsoleSessionState;

    setTasksFocused(focused: boolean): void {
        setTasksFocusedInState(this.self(), focused);
    }

    setSelectedReviewTaskId(taskId: string): void {
        setSelectedReviewTaskIdInState(this.self(), taskId);
    }

    get selectedTask(): Record<string, any> | undefined {
        return resolveSelectedTask(this.self());
    }

    get filteredReviewTaskChoices(): AgentConsoleReviewTaskItem[] {
        return resolveFilteredReviewTaskChoices(this.self());
    }

    formatScheduledTimestamp(value?: number): string {
        return formatScheduledTimestampInState(value);
    }

    buildSelectedScheduledTaskCopyText(): string {
        return buildSelectedScheduledTaskCopyTextInState(this.self());
    }

    setToolsFocused(focused: boolean): void {
        setToolsFocusedInState(this.self(), focused);
    }

    setSelectedToolName(toolName: string): void {
        setSelectedToolNameInState(this.self(), toolName);
    }

    moveToolSelection(delta: number): void {
        moveToolSelectionInState(this.self(), delta);
    }

    moveToolSelectionPage(delta: number, pageSize?: number): void {
        moveToolSelectionPageInState(this.self(), delta, pageSize);
    }

    selectFirstTool(): void {
        selectFirstToolInState(this.self());
    }

    selectLastTool(): void {
        selectLastToolInState(this.self());
    }

    get selectedTool(): AgentConsoleToolItem | undefined {
        return resolveSelectedTool(this.self());
    }

    moveToolRunSelection(delta: number): void {
        moveToolRunSelectionInState(this.self(), delta);
    }

    moveToolRunSelectionPage(delta: number, pageSize?: number): void {
        moveToolRunSelectionPageInState(this.self(), delta, pageSize);
    }

    selectFirstToolRun(): void {
        selectFirstToolRunInState(this.self());
    }

    selectLastToolRun(): void {
        selectLastToolRunInState(this.self());
    }

    get selectedToolRun(): AgentConsoleToolRun | undefined {
        return resolveSelectedToolRun(this.self());
    }

    setApprovalsFocused(focused: boolean): void {
        setApprovalsFocusedInState(this.self(), focused);
    }

    requestApprovalAttention(): void {
        requestApprovalAttentionInState(this.self());
    }

    setSelectedApprovalId(approvalId: string): void {
        setSelectedApprovalIdInState(this.self(), approvalId);
    }

    moveApprovalSelection(delta: number): void {
        moveApprovalSelectionInState(this.self(), delta);
    }

    moveApprovalSelectionPage(delta: number, pageSize?: number): void {
        moveApprovalSelectionPageInState(this.self(), delta, pageSize);
    }

    selectFirstApproval(): void {
        selectFirstApprovalInState(this.self());
    }

    selectLastApproval(): void {
        selectLastApprovalInState(this.self());
    }

    get selectedApproval(): AgentConsoleApprovalRequest | undefined {
        return resolveSelectedApproval(this.self());
    }
}

import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';

export interface AgentConsolePanelVisibility {
    status: boolean;
    sessions: boolean;
    approvals: boolean;
    tasks: boolean;
    jobs: boolean;
    messageDetail: boolean;
    timelineEventInspector: boolean;
    review: boolean;
    gitSnapshot: boolean;
    activity: boolean;
    tools: boolean;
    working: boolean;
    toolRuns: boolean;
    select: boolean;
    suggestion: boolean;
    whichKey: boolean;
    healthPopover: boolean;
    textOverlay: boolean;
    commandOutputs: boolean;
    pendingQuestion: boolean;
}

/** Panel shown/hidden projection for the console template; data only, no layout branching. */
export function resolveAgentConsolePanelVisibility(state: AgentConsoleSessionState): AgentConsolePanelVisibility {
    return {
        status: (state.consoleOptions.showStatusline && !!state.statusline.length)
            || !!state.notice
            || !!state.pendingApprovals.length,
        sessions: state.sessionsFocused,
        approvals: state.approvalsFocused,
        tasks: state.tasksFocused,
        jobs: state.jobsFocused,
        messageDetail: state.consoleOptions.messageToggleInteraction === 'enter'
            && state.messageDetailOpen
            && !!state.selectedMessage,
        timelineEventInspector: state.timelineEventInspectorOpen,
        review: !!state.reviewOpen,
        gitSnapshot: !!state.gitSnapshotOpen,
        activity: false,
        tools: state.toolsFocused,
        working: state.status === 'running' || state.status === 'reasoning',
        toolRuns: state.toolRunsFocused,
        select: !!state.selectMenu && !isAgentConsoleSuggestionMenu(state.selectMenu),
        suggestion: !!state.selectMenu && isAgentConsoleSuggestionMenu(state.selectMenu),
        whichKey: state.whichKeyVisible,
        healthPopover: state.healthPopoverVisible,
        textOverlay: state.hasTextOverlayFocus(),
        commandOutputs: state.commandOutputsOpen,
        pendingQuestion: !!state.pendingQuestion
    };
}

/** Backward-compatible component surface: template uses `panels`, hosts/tests keep the named getters. */
export abstract class AgentConsolePanelVisibilityHost {
    protected abstract state: AgentConsoleSessionState;

    get panels(): AgentConsolePanelVisibility {
        return resolveAgentConsolePanelVisibility(this.state);
    }

    get showStatusPanel(): boolean { return this.panels.status; }
    get showSessionsPanel(): boolean { return this.panels.sessions; }
    get showApprovalsPanel(): boolean { return this.panels.approvals; }
    get showTasksPanel(): boolean { return this.panels.tasks; }
    get showJobsPanel(): boolean { return this.panels.jobs; }
    get showMessageDetailPanel(): boolean { return this.panels.messageDetail; }
    get showTimelineEventInspector(): boolean { return this.panels.timelineEventInspector; }
    get showReviewPanel(): boolean { return this.panels.review; }
    get showGitSnapshotPanel(): boolean { return this.panels.gitSnapshot; }
    get showActivityPanel(): boolean { return this.panels.activity; }
    get showToolsPanel(): boolean { return this.panels.tools; }
    get showWorkingPanel(): boolean { return this.panels.working; }
    get showToolRunsPanel(): boolean { return this.panels.toolRuns; }
    get showSelectPanel(): boolean { return this.panels.select; }
    get showSuggestionPanel(): boolean { return this.panels.suggestion; }
    get showWhichKeyPanel(): boolean { return this.panels.whichKey; }
    get showHealthPopover(): boolean { return this.panels.healthPopover; }
    get showTextOverlayPanel(): boolean { return this.panels.textOverlay; }
    get showCommandOutputsPanel(): boolean { return this.panels.commandOutputs; }
    get showPendingQuestionPanel(): boolean { return this.panels.pendingQuestion; }
}

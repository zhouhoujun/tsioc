import { batchReactiveUpdates } from '@tsdi/components';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

export type AgentConsolePanelKey =
    | 'sessions' | 'tools' | 'approvals' | 'jobs' | 'tasks' | 'toolRuns'
    | 'review' | 'gitSnapshot' | 'messageDetail' | 'timelineEventInspector'
    | 'commandOutputs' | 'textOverlay' | 'whichKey' | 'healthPopover';

/**
 * Command dialogs are exclusive: opening one dismisses the other transient
 * panels instead of stacking them below the composer. Select menus are left
 * alone so their intentional parent/submenu chain keeps working.
 */
export function dismissBackgroundPanels(state: AgentConsoleSessionState, except?: AgentConsolePanelKey): void {
    // Opening a dialog can close a dozen transient panels at once; coalesce
    // those writes into one binding pass instead of one pass per panel.
    batchReactiveUpdates(() => dismissBackgroundPanelsNow(state, except));
}

function dismissBackgroundPanelsNow(state: AgentConsoleSessionState, except?: AgentConsolePanelKey): void {
    const keep = (key: AgentConsolePanelKey): boolean => key === except;
    if (!keep('sessions')) state.sessionsFocused = false;
    if (!keep('tools')) state.toolsFocused = false;
    if (!keep('approvals')) state.approvalsFocused = false;
    if (!keep('jobs')) state.jobsFocused = false;
    if (!keep('tasks')) state.tasksFocused = false;
    if (!keep('toolRuns')) state.toolRunsFocused = false;
    if (!keep('review')) state.reviewOpen = false;
    if (!keep('gitSnapshot')) state.gitSnapshotOpen = false;
    if (!keep('messageDetail')) state.messageDetailOpen = false;
    if (!keep('timelineEventInspector')) state.timelineEventInspectorOpen = false;
    if (!keep('commandOutputs')) state.commandOutputsOpen = false;
    if (!keep('textOverlay')) {
        state.textOverlay = null;
        state.textOverlayBack = undefined;
    }
    if (!keep('whichKey')) state.whichKeyVisible = false;
    if (!keep('healthPopover')) state.healthPopoverVisible = false;
    state.syncDerivedInputFocus();
}

import { isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';
import type { AgentConsoleFocusLayer } from './AgentConsoleSessionState';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import { AgentConsoleOverlayController } from './AgentConsoleOverlay';

export interface AgentConsoleFocusStatePort {
    focusStack: AgentConsoleFocusLayer[];
    inputFocused: boolean;
    inputLocked: boolean;
    modalPromptActive: boolean;
    sessionsFocused: boolean;
    toolRunsFocused: boolean;
    projectsFocused: boolean;
    threadsFocused: boolean;
    tasksFocused: boolean;
    jobsFocused: boolean;
    toolsFocused: boolean;
    approvalsFocused: boolean;
    messagesFocused: boolean;
    reviewOpen: boolean;
    pendingQuestion: unknown;
    timelineEventInspectorOpen: boolean;
    messageDetailOpen: boolean;
    messageDetailTakesFocus: boolean;
    commandOutputsOpen: boolean;
    gitSnapshotOpen: boolean;
    textOverlay: unknown;
    selectMenu?: unknown;
}

export abstract class AgentConsoleFocusController {
    private readonly overlay = new AgentConsoleOverlayController();
    constructor(protected readonly state: AgentConsoleSessionState) {}

    async dismiss(transcriptNavigation: AgentConsoleTranscriptNavigationController): Promise<boolean> {
        const state = this.state;
        if (state.commandOutputsOpen) { state.closeCommandOutputs(); return true; }
        if (state.textOverlay) { state.closeTextOverlay(); return true; }
        if (state.selectMenu) { await state.cancelSelectMenu(); return true; }
        if (state.gitSnapshotOpen) { state.closeGitSnapshotDetail(); return true; }
        if (state.reviewOpen) { state.closeReview(); return true; }
        if (state.timelineEventInspectorOpen) {
            state.closeTimelineEventInspector();
            if (state.messagesFocused) transcriptNavigation.setFocused(false);
            return true;
        }
        if (state.messageDetailOpen) {
            state.closeMessageDetail();
            if (state.messagesFocused) transcriptNavigation.setFocused(false);
            return true;
        }
        if (state.messagesFocused) { transcriptNavigation.setFocused(false); return true; }
        if (state.approvalsFocused) { state.setApprovalsFocused(false); return true; }
        if (state.tasksFocused) { state.setTasksFocused(false); return true; }
        if (state.jobsFocused) { state.setJobsFocused(false); return true; }
        if (state.toolsFocused) { state.setToolsFocused(false); return true; }
        if (state.sessionsFocused) { state.setSessionsFocused(false); return true; }
        if (state.toolRunsFocused) { state.setToolRunsFocused(false); return true; }
        if (state.projectsFocused) { state.setProjectsFocused(false); return true; }
        if (state.threadsFocused) { state.setThreadsFocused(false); return true; }
        if (!state.inputFocused) { state.setInputFocused(true); return true; }
        return false;
    }

    async handleEscape(transcriptNavigation: AgentConsoleTranscriptNavigationController): Promise<boolean> {
        const state = this.state;
        if (state.pendingQuestion) {
            state.setPendingQuestion(null);
            state.setInputFocused(true);
            return true;
        }
        if (state.selectMenu) {
            await state.dismissSelectMenuLayer();
            return true;
        }
        if (state.textOverlay || state.gitSnapshotOpen || state.reviewOpen || state.timelineEventInspectorOpen
            || state.messageDetailOpen || state.messagesFocused || state.approvalsFocused || state.tasksFocused
            || state.jobsFocused || state.toolsFocused || state.sessionsFocused || state.toolRunsFocused
            || state.projectsFocused || state.threadsFocused) {
            await this.dismiss(transcriptNavigation);
            return true;
        }
        if (state.status === 'running' || state.status === 'reasoning') return true;
        return !!(await state.escapeAction?.());
    }

    isDismissKey(key: string): boolean {
        return key === 'escape' || key === 'esc' || key === 'q';
    }

    resolveShortcutKey(rawText: string, controlKey?: string): string {
        if (controlKey === 'return') return 'enter';
        if (controlKey) return controlKey;
        const normalized = String(rawText || '').trim().toLowerCase();
        switch (normalized) {
            case 'y': return 'copy';
            case 'a': return 'approve';
            case 'd': return 'deny';
            default: return normalized;
        }
    }

    handleSelectKey(key: string): boolean {
        const state = this.state;
        const normalized = String(key || '').trim().toLowerCase();
        if (!state.selectMenu?.options.length) return false;
        const decision = this.overlay.resolveKey(normalized, state.selectMenu.options.length);
        switch (decision.action) {
            case 'move': state.moveSelectMenu(decision.delta); return true;
            case 'home': state.moveSelectMenuToEdge('start'); return true;
            case 'end': state.moveSelectMenuToEdge('end'); return true;
            case 'page': state.moveSelectMenuPage(decision.direction); return true;
            case 'confirm': void state.confirmSelectMenu(); return true;
            case 'escape': void state.dismissSelectMenuLayer(); return true;
            case 'choose': void state.chooseSelectMenuIndex(decision.index); return true;
            default: return false;
        }
    }

    handleMenuInput(key: string, text: string): boolean {
        const state = this.state;
        if (!state.selectMenu) return false;
        const decision = this.overlay.resolveMenuKey(key, text, state.selectMenu.options.length);
        switch (decision.action) {
            case 'move': state.moveSelectMenu(decision.delta); return true;
            case 'home': state.moveSelectMenuToEdge('start'); return true;
            case 'end': state.moveSelectMenuToEdge('end'); return true;
            case 'page': state.moveSelectMenuPage(decision.direction); return true;
            case 'accept': void state.acceptSelectMenu(); return true;
            case 'choose': state.setSelectMenuIndex(decision.index); void state.acceptSelectMenu(); return true;
            case 'digit-consume': return true;
            case 'cancel':
                state.setSuppressSuggestionMenu(true);
                void state.cancelSelectMenu();
                return false;
            case 'escape': void state.dismissSelectMenuLayer(); return true;
            default: return false;
        }
    }

    handlePendingQuestionKey(normalized: string): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.pendingQuestion) return undefined;
        const decision = this.overlay.resolveKey(normalized, state.pendingQuestion.options.length);
        switch (decision.action) {
            case 'move': state.movePendingQuestionSelection(decision.delta); return true;
            case 'home': state.movePendingQuestionSelectionToEdge('start'); return true;
            case 'end': state.movePendingQuestionSelectionToEdge('end'); return true;
            case 'page': state.movePendingQuestionSelectionPage(decision.direction); return true;
            case 'confirm': {
                const typed = String(state.input || '').trim();
                const selected = state.pendingQuestion.options[state.pendingQuestionSelectedIndex];
                if (state.questionAction && typed && typed !== selected) return state.submitPendingQuestionInput();
                return state.choosePendingQuestion();
            }
            case 'choose': return state.choosePendingQuestion(decision.index);
            case 'escape': state.setPendingQuestion(null); return true;
            default: return this.overlay.isDigitKey(normalized) ? false : undefined;
        }
    }

    handleCommandOutputsKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.commandOutputsOpen) return undefined;
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'up': case 'k': state.moveCommandOutputSelection(-1); return true;
            case 'down': case 'j': state.moveCommandOutputSelection(1); return true;
            case 'pageup': state.scrollCommandOutputsPage(-1); return true;
            case 'pagedown': state.scrollCommandOutputsPage(1); return true;
            case 'home': state.scrollCommandOutputsToEdge('start'); return true;
            case 'end': state.scrollCommandOutputsToEdge('end'); return true;
            case '/': state.commandOutputsFilterMode = true; state.setCommandOutputsFilter(''); return true;
            case 'return': case 'enter': return state.copySelectedCommandOutput();
            case 'backspace':
                if (!state.commandOutputsFilterMode) return false;
                state.setCommandOutputsFilter(state.commandOutputsFilter.slice(0, -1));
                return true;
            default:
                if (state.commandOutputsFilterMode && normalized.length === 1) {
                    state.setCommandOutputsFilter(`${state.commandOutputsFilter}${normalized}`);
                    return true;
                }
                return false;
        }
    }

    handleTextOverlayKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.textOverlay) return undefined;
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'down': state.scrollTextOverlay(1); return true;
            case 'up': state.scrollTextOverlay(-1); return true;
            case 'pageup': state.scrollTextOverlayPage(-1); return true;
            case 'pagedown': state.scrollTextOverlayPage(1); return true;
            case 'home': state.scrollTextOverlayToEdge('start'); return true;
            case 'end': state.scrollTextOverlayToEdge('end'); return true;
            default: return false;
        }
    }

    handleGitSnapshotKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.gitSnapshotOpen) return undefined;
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'copy': return this.copyGitSnapshot();
            case 'down': state.scrollGitSnapshotDetail(1); return true;
            case 'up': state.scrollGitSnapshotDetail(-1); return true;
            case 'left': state.scrollGitSnapshotDetailColumns(-4); return true;
            case 'right': state.scrollGitSnapshotDetailColumns(4); return true;
            case 'pageup': state.scrollGitSnapshotDetailPage(-1); return true;
            case 'pagedown': state.scrollGitSnapshotDetailPage(1); return true;
            case 'home': state.scrollGitSnapshotDetailToEdge('start'); return true;
            case 'end': state.scrollGitSnapshotDetailToEdge('end'); return true;
            case 'revert': state.revertGitSnapshotFromDetailAction?.(); return true;
            default: return false;
        }
    }

    private async copyGitSnapshot(): Promise<boolean> {
        const state = this.state;
        await state.copyFocusedTextAction?.(
            state.gitSnapshotDetailLines.slice(state.gitSnapshotDetailScroll).join('\n'),
            'git snapshot diff'
        );
        return true;
    }

    handleTimelineInspectorKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.timelineEventInspectorOpen) return undefined;
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'enter': case 'esc': state.closeTimelineEventInspector(); return true;
            case 'copy': return this.copyTimelineEvent();
            case 'down': state.scrollTimelineEventDetail(1); return true;
            case 'up': state.scrollTimelineEventDetail(-1); return true;
            case 'left': state.scrollTimelineEventDetailColumns(-4); return true;
            case 'right': state.scrollTimelineEventDetailColumns(4); return true;
            case 'pageup': state.scrollTimelineEventDetailPage(-1); return true;
            case 'pagedown': state.scrollTimelineEventDetailPage(1); return true;
            case 'home': state.scrollTimelineEventDetailToEdge('start'); return true;
            case 'end': state.scrollTimelineEventDetailToEdge('end'); return true;
            case 'r': return state.canRetryTimelineEvent() ? this.retryTimelineEvent() : false;
            default: return false;
        }
    }

    handleMessageDetailKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.messageDetailOpen) return undefined;
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'enter': state.closeMessageDetail(); return true;
            case 'copy': return this.copySelectedMessage();
            case 'down': state.scrollMessageDetail(1); return true;
            case 'up': state.scrollMessageDetail(-1); return true;
            case 'left': state.scrollMessageDetailColumns(-4); return true;
            case 'right': state.scrollMessageDetailColumns(4); return true;
            case 'pageup': state.scrollMessageDetailPage(-1); return true;
            case 'pagedown': state.scrollMessageDetailPage(1); return true;
            case 'home': state.scrollMessageDetailToEdge('start'); return true;
            case 'end': state.scrollMessageDetailToEdge('end'); return true;
            default: return false;
        }
    }

    private async copyTimelineEvent(): Promise<boolean> {
        await this.state.copyFocusedTextAction?.(this.state.timelineEventDetailLines.join('\n'), 'timeline event');
        return true;
    }

    private async retryTimelineEvent(): Promise<boolean> {
        const state = this.state;
        const payload = state.buildTimelineEventRetryPayload();
        if (payload?.toolCallId) await state.retrySelectedTaskAction?.(payload.toolCallId);
        state.closeTimelineEventInspector();
        return true;
    }

    private async copySelectedMessage(): Promise<boolean> {
        await this.state.copyFocusedTextAction?.(this.state.selectedMessage?.content || '', 'selected message');
        return true;
    }

    handleMessageListKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.messagesFocused) return undefined;
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'copy': return this.copySelectedMessage();
            case 'down':
                if (state.selectedMessage?.metadata?.uiKind === 'file-change') state.moveReviewFileSelection(1);
                else transcriptNavigation.move(1);
                return true;
            case 'up':
                if (state.selectedMessage?.metadata?.uiKind === 'file-change') state.moveReviewFileSelection(-1);
                else transcriptNavigation.move(-1);
                return true;
            case 'pageup': transcriptNavigation.movePage(-1); return true;
            case 'pagedown': transcriptNavigation.movePage(1); return true;
            case 'home': transcriptNavigation.selectFirst(); return true;
            case 'end': transcriptNavigation.selectLast(); return true;
            case 'r': return this.retryFailedMessage();
            case 'enter': return this.openSelectedMessage();
            default: return false;
        }
    }

    private async retryFailedMessage(): Promise<boolean> {
        const state = this.state;
        const selected = state.selectedMessage;
        if (!selected || !state.isFailedEventMessage(selected) || !state.retryFailedEventAction) return false;
        return (await state.retryFailedEventAction(selected)) !== false;
    }

    private openSelectedMessage(): boolean {
        const state = this.state;
        if (state.selectedMessage?.metadata?.uiKind === 'plan-todo') return state.togglePlanTodoExpanded();
        if (state.selectedMessage?.metadata?.uiKind === 'file-change') { state.openReview(); return true; }
        if (state.isTimelineEventMessage(state.selectedMessage)) { state.openTimelineEventInspector(); return true; }
        state.openMessageDetail();
        return true;
    }

    handleReviewKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.reviewOpen) return undefined;
        if ((normalized === 'esc' || normalized === 'escape') && state.canCancelFocusedCodingTask()) {
            return this.cancelFocusedTask();
        }
        if (this.isDismissKey(normalized)) return this.dismiss(transcriptNavigation);
        switch (normalized) {
            case 'copy': return this.copyReview();
            case ',': state.moveReviewGroupSelection(-1); return true;
            case '.': state.moveReviewGroupSelection(1); return true;
            case 'a': state.setReviewPatchFilter('additions'); return true;
            case 'u': state.setReviewPatchFilter('all'); return true;
            case '[': state.moveReviewFileSelection(-1); return true;
            case ']': state.moveReviewFileSelection(1); return true;
            case 'p': return state.navigateReviewLineage(-1);
            case 'n': return state.navigateReviewLineage(1);
            case 'down': state.scrollReviewDetail(1); return true;
            case 'up': state.scrollReviewDetail(-1); return true;
            case 'left': state.scrollReviewDetailColumns(-4); return true;
            case 'right': state.scrollReviewDetailColumns(4); return true;
            case 'pageup': state.scrollReviewDetailPage(-1); return true;
            case 'pagedown': state.scrollReviewDetailPage(1); return true;
            case 'home': state.scrollReviewDetailToEdge('start'); return true;
            case 'end': state.scrollReviewDetailToEdge('end'); return true;
            case '{': state.jumpReviewHunk(-1); return true;
            case '}': state.jumpReviewHunk(1); return true;
            case 'f': state.toggleReviewHunkFold(); return true;
            case 's': state.toggleReviewSideBySide(); return true;
            case 'r': return state.canRetryFocusedCodingTask() ? this.retryFocusedTask() : false;
            default: return false;
        }
    }

    handleApprovalKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.approvalsFocused) return undefined;
        const decision = this.overlay.resolveListKey(normalized);
        switch (decision.action) {
            case 'move': state.moveApprovalSelection(decision.delta); return true;
            case 'home': state.selectFirstApproval(); return true;
            case 'end': state.selectLastApproval(); return true;
            case 'page': state.moveApprovalSelectionPage(decision.direction); return true;
            case 'escape': return this.dismiss(transcriptNavigation);
        }
        if (normalized === 'copy') return this.copyApproval();
        if (normalized === 'approve' || normalized === 'deny') return this.resolveApproval(normalized);
        return false;
    }

    private async cancelFocusedTask(): Promise<boolean> { await this.state.cancelFocusedCodingTask(); return true; }
    private async retryFocusedTask(): Promise<boolean> { await this.state.retryFocusedCodingTask(); return true; }
    private async copyReview(): Promise<boolean> {
        await this.state.copyFocusedTextAction?.(this.state.buildSelectedReviewCopyText(), 'review'); return true;
    }
    private async copyApproval(): Promise<boolean> {
        await this.state.copyFocusedTextAction?.(this.state.buildSelectedApprovalCopyText(), 'selected approval'); return true;
    }
    private async resolveApproval(action: 'approve' | 'deny'): Promise<boolean> {
        const state = this.state;
        if (!state.selectedApproval?.id) return false;
        await state.resolveApprovalAction?.(action, state.selectedApproval.id);
        return true;
    }

    sync(): void {
        const layers: AgentConsoleFocusLayer[] = [];
        const state = this.state;
        if (state.messagesFocused) layers.push('messages');
        if (state.threadsFocused) layers.push('threads');
        if (state.projectsFocused) layers.push('projects');
        if (state.sessionsFocused) layers.push('sessions');
        if (state.toolRunsFocused) layers.push('tool-runs');
        if (state.toolsFocused) layers.push('tool');
        if (state.jobsFocused) layers.push('jobs');
        if (state.tasksFocused) layers.push('plan');
        if (state.approvalsFocused) layers.push('approval');
        if (state.pendingQuestion) layers.push('question');
        if (this.hasBlockingSelectMenu()) layers.push('select');
        if (state.textOverlay) layers.push('overlay');
        if (this.hasMessageDetailFocus()) layers.push('message-detail');
        if (state.timelineEventInspectorOpen) layers.push('timeline-inspector');
        if (state.reviewOpen) layers.push('review');
        if (state.gitSnapshotOpen) layers.push('git-snapshot');
        if (state.commandOutputsOpen) layers.push('command-outputs');
        state.focusStack = layers;
        state.inputFocused = !state.projectsFocused && !state.threadsFocused && !state.toolRunsFocused && !this.isAnyFocusActive();
    }

    get activeLayer(): AgentConsoleFocusLayer | undefined { return this.state.focusStack[this.state.focusStack.length - 1]; }
    get layers(): readonly AgentConsoleFocusLayer[] { return this.state.focusStack.slice(); }
    push(layer: AgentConsoleFocusLayer): readonly AgentConsoleFocusLayer[] {
        this.state.focusStack = [...this.state.focusStack.filter(item => item !== layer), layer]; return this.layers;
    }
    pop(): AgentConsoleFocusLayer | undefined {
        const layer = this.state.focusStack.pop(); this.state.focusStack = this.state.focusStack.slice(); return layer;
    }
    replace(layer: AgentConsoleFocusLayer): readonly AgentConsoleFocusLayer[] {
        this.state.focusStack = this.state.focusStack.length ? [...this.state.focusStack.slice(0, -1), layer] : [layer]; return this.layers;
    }
    consume(layer: AgentConsoleFocusLayer): boolean { if (this.activeLayer !== layer) return false; this.pop(); return true; }

    hasBlockingSelectMenu(): boolean { return !!this.state.selectMenu && !isAgentConsoleSuggestionMenu(this.state.selectMenu as any); }
    hasSessionFocus(): boolean { return this.state.sessionsFocused; }
    hasTaskFocus(): boolean { return this.state.tasksFocused; }
    hasScheduledJobFocus(): boolean { return this.state.jobsFocused; }
    hasToolFocus(): boolean { return this.state.toolsFocused; }
    hasApprovalFocus(): boolean { return this.state.approvalsFocused; }
    hasReviewFocus(): boolean { return this.state.reviewOpen; }
    hasMessageFocus(): boolean { return this.state.messagesFocused; }
    hasMessageDetailFocus(): boolean { return this.state.messageDetailOpen && this.state.messageDetailTakesFocus; }
    isAnyFocusActive(): boolean {
        const state = this.state;
        return !!state.pendingQuestion || this.hasBlockingSelectMenu() || state.sessionsFocused || state.tasksFocused
            || state.jobsFocused || state.toolsFocused || state.approvalsFocused || state.reviewOpen || state.messagesFocused
            || state.timelineEventInspectorOpen || this.hasMessageDetailFocus() || !!state.textOverlay || state.commandOutputsOpen;
    }
    shouldRenderTerminalCursor(): boolean { return this.state.inputFocused || this.isAnyFocusActive() || this.state.inputLocked || this.state.modalPromptActive; }
    resolveTerminalCursorMode(): 'prompt' | 'bottom' { return this.isAnyFocusActive() || this.state.inputLocked || this.state.modalPromptActive ? 'bottom' : 'prompt'; }
    shouldRouteDraftNavigation(hasActiveTextPrompt: boolean): boolean {
        const state = this.state;
        return !state.toolsFocused && !state.approvalsFocused && !state.reviewOpen && !this.hasBlockingSelectMenu()
            && !state.sessionsFocused && !state.messagesFocused && !this.hasMessageDetailFocus() && !state.pendingQuestion
            && !state.inputLocked && !state.modalPromptActive && !hasActiveTextPrompt;
    }
}

export class DefaultAgentConsoleFocusController extends AgentConsoleFocusController {}

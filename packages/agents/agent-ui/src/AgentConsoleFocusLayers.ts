import { isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';
import type { AgentConsoleFocusLayer } from './AgentConsoleSessionState';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import { AgentConsoleOverlayController } from './AgentConsoleOverlay';
import { handleSessionsKeyView } from './AgentConsoleSessionPanelKeys';
import { agentConsoleTextChunk } from './AgentConsoleKeyText';
import { AgentConsoleFocusTranscriptLayers } from './AgentConsoleFocusTranscriptLayers';

/**
 * Layers that take keyboard input away from the composer. `question` is
 * deliberately absent: the pending-question card accepts a typed custom answer,
 * so it must not claim the composer's input.
 */
const COMPOSER_BLOCKING_LAYERS: ReadonlySet<AgentConsoleFocusLayer> = new Set<AgentConsoleFocusLayer>([
    'messages', 'sessions', 'projects', 'threads', 'plan', 'jobs', 'tool', 'tool-runs',
    'approval', 'select', 'overlay', 'message-detail', 'timeline-inspector', 'review', 'command-outputs'
]);

export interface AgentConsoleFocusLayersPort {
    focusStack: AgentConsoleFocusLayer[];
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

export abstract class AgentConsoleFocusLayers extends AgentConsoleFocusTranscriptLayers {
    protected readonly overlay = new AgentConsoleOverlayController();

    constructor(protected readonly state: AgentConsoleSessionState) {
        super();
    }

    async dismiss(transcriptNavigation: AgentConsoleTranscriptNavigationController): Promise<boolean> {
        const state = this.state;
        if (state.commandOutputsOpen) { state.closeCommandOutputs(); return true; }
        if (state.textOverlay) { state.closeTextOverlay(); return true; }
        if (state.selectMenu) { await state.cancelSelectMenu(); return true; }
        if (state.gitSnapshotOpen) { state.closeGitSnapshotDetail(); return true; }
        if (state.reviewOpen && this.reviewCommandMode) { this.endReviewCommand(); return true; }
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
        return false;
    }

    async handleEscape(transcriptNavigation: AgentConsoleTranscriptNavigationController): Promise<boolean> {
        const state = this.state;
        if (state.pendingQuestion) {
            await state.dismissPendingQuestion();
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
        // The terminal can deliver Enter as a bare CR/LF without a control key;
        // trimming it to '' used to drop the key entirely (`enter open` did
        // nothing in the transcript/message focus layers).
        if (rawText === '\r' || rawText === '\n') return 'enter';
        // Two fast Esc presses coalesce into one alt-esc read. The pager already
        // closes on it; focus layers (sessions/jobs/outputs/...) must dismiss
        // too instead of swallowing the key as an unknown alt sequence.
        // A lone Esc arrives as a bare escape byte; focus layers must treat it
        // as reject/dismiss instead of swallowing it as an unknown alt sequence.
        if (rawText === '\u001b' || rawText === '\u001b\u001b') return 'escape';
        // Uppercase A = "always allow for this session"; plain `a` stays approve.
        if (rawText === 'A') return 'approve-always';
        const normalized = String(rawText || '').trim().toLowerCase();
        switch (normalized) {
            case 'y': return 'copy';
            case 'a': return this.state.sessionsFocused ? normalized : 'approve';
            case 'd': return this.state.sessionsFocused ? normalized : 'deny';
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
            case 'complete': void state.completeSelectMenu(); return true;
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
            case 'escape': return state.dismissPendingQuestion();
            default: return this.overlay.isDigitKey(normalized) ? false : undefined;
        }
    }

    handleCommandOutputsKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): boolean | Promise<boolean> | undefined {
        const state = this.state;
        if (!state.commandOutputsOpen) return undefined;
        // Filter mode owns printable keys: j/k are navigation only while the
        // filter is off, and q closes the panel only while it is off too.
        if (state.commandOutputsFilterMode) {
            if (normalized === 'esc' || normalized === 'escape') {
                state.commandOutputsFilterMode = false;
                state.setCommandOutputsFilter('');
                return true;
            }
            if (normalized === 'backspace' || /^[\u007f\b]+$/.test(normalized)) {
                const drop = normalized === 'backspace' ? 1 : normalized.length;
                state.setCommandOutputsFilter(state.commandOutputsFilter.slice(0, -drop));
                return true;
            }
            const chunk = agentConsoleTextChunk(normalized);
            if (chunk) {
                state.setCommandOutputsFilter(`${state.commandOutputsFilter}${chunk}`);
                return true;
            }
        }
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
            default:
                return false;
        }
    }

    handleSessionsKey(
        normalized: string,
        transcriptNavigation: AgentConsoleTranscriptNavigationController
    ): Promise<boolean | undefined> {
        return handleSessionsKeyView(this.state, normalized, transcriptNavigation, {
            dismiss: (navigation) => this.dismiss(navigation)
        });
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

    sync(): void {
        const layers: AgentConsoleFocusLayer[] = [];
        const state = this.state;
        if (!state.reviewOpen) this.reviewCommandMode = false;
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
        if (state.reviewOpen && !this.reviewCommandMode) layers.push('review');
        if (state.gitSnapshotOpen) layers.push('git-snapshot');
        if (state.commandOutputsOpen) layers.push('command-outputs');
        state.focusStack = layers;
    }

    /**
     * Whether an active focus layer takes keyboard input away from the composer.
     * Derived from `focusStack` so there is a single source of truth.
     */
    blocksComposerInput(): boolean {
        return this.state.focusStack.some(layer => COMPOSER_BLOCKING_LAYERS.has(layer));
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
    hasReviewFocus(): boolean { return this.state.reviewOpen && !this.reviewCommandMode; }
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

export class DefaultAgentConsoleFocusLayers extends AgentConsoleFocusLayers {}

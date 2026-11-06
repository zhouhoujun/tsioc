import type {
    AgentConsoleActivity,
    AgentConsolePendingAttachment,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun
} from './AgentConsoleStateTypes';
import { applyAbsoluteTokenUsage, applyTokenUsage, resetTurnTokenUsage as resetTurnTokenUsageInState } from './AgentConsoleTokenUsageState';
import {
    appendPendingAttachment as appendPendingAttachmentInState,
    clearPendingAttachments as clearPendingAttachmentsInState,
    moveInputCursor as moveInputCursorInState,
    moveInputCursorByWord as moveInputCursorByWordInState,
    moveInputCursorToEdge as moveInputCursorToEdgeInState,
    deleteInputWord as deleteInputWordInState,
    killInputToEdge as killInputToEdgeInState,
    setInput as setInputInState,
    setInputCursor as setInputCursorInState,
    setInputPlaceholder as setInputPlaceholderInState,
    setMessagesFocused as setMessagesFocusedInState,
    setPendingAttachments as setPendingAttachmentsInState,
    setPlanNudgesEnabled as setPlanNudgesEnabledInState,
    setTranscriptFollowProvider as setTranscriptFollowProviderInState,
    syncTranscriptFollowing as syncTranscriptFollowingInState
} from './AgentConsoleInputState';
import { AgentConsoleSessionLocaleHost } from './AgentConsoleSessionLocaleHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Status, tools, token usage and input attachment facade. */
export abstract class AgentConsoleSessionTelemetryHost extends AgentConsoleSessionLocaleHost {
    protected abstract self(): AgentConsoleSessionState;

    get highlightedToolRun(): AgentConsoleToolRun | undefined {
        const active = this.toolRuns.find(item => item.status === 'running');
        if (active) {
            return active;
        }
        return this.toolRuns
            .slice()
            .sort((left, right) => right.updatedAt - left.updatedAt)[0];
    }

    get visibleActivities(): AgentConsoleActivity[] {
        return this.activities.filter(activity => activity.kind !== 'turn');
    }

    clearActivities(): void {
        if (!this.activities.length) {
            return;
        }
        this.activities = [];
    }

    /** Last assistant answer row; kept fully expanded in viewport mode while other long bodies collapse. */
    setStatus(status: string): void {
        const nextStatus = status || 'idle';
        if (this.status === nextStatus) {
            return;
        }
        if ((nextStatus === 'running' || nextStatus === 'reasoning') && !this.turnStartedAt) {
            this.turnStartedAt = Date.now();
        }
        // A cancelled turn is over too: clear the clock so the next turn starts at zero.
        if (nextStatus === 'idle' || nextStatus === 'error' || nextStatus === 'cancelled') {
            this.turnStartedAt = 0;
        }
        this.status = nextStatus;
    }

    setTools(tools: AgentConsoleToolItem[]): void {
        this.tools = tools;
        if (!this.tools.length) {
            this.selectedToolName = '';
            this.toolsFocused = false;
        } else if (this.selectedToolName && this.tools.some(item => item.name === this.selectedToolName)) {
            // Preserve explicit tool selection when possible.
        } else {
            this.selectedToolName = this.tools[0].name;
        }
        this.refreshInputSuggestions();
    }

    setTokenUsage(usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null): void {
        applyTokenUsage(this.self(), usage);
    }

    setTokenUsageAbsolute(usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null): void {
        applyAbsoluteTokenUsage(this.self(), usage);
    }

    resetTurnTokenUsage(): void {
        resetTurnTokenUsageInState(this.self());
    }

    get planNudgeActive(): boolean {
        if (!this.planNudgesEnabled || this.planMode) {
            return false;
        }
        const draft = String(this.input || '').trim();
        if (draft.length < 20 || draft.startsWith('/')) {
            return false;
        }
        const explicitPlanIntent = /(?:\bplan(?:ning)?\b|\bdesign\b|\barchitecture\b|方案|规划|设计|先不要改|不要(?:先)?修改|先别改)/i;
        return explicitPlanIntent.test(draft);
    }

    get inputPlaceholderLabel(): string {
        return this.input ? '' : this.inputPlaceholder;
    }

    get inputHintLabel(): string {
        const base = this.formatStatusFooter(this.model, this.modelProfile, this.workspace);
        const oneShotSummary = this.oneShotModelProfile
            ? `next model ${this.oneShotModelProfile}`
            : '';
        const attachmentSummary = this.pendingAttachments.length
            ? `${this.pendingAttachments.length} attachment${this.pendingAttachments.length === 1 ? '' : 's'}`
            : '';
        return [base, oneShotSummary, attachmentSummary].filter(Boolean).join(' · ');
    }

    setInput(value: string, cursor = value.length): void { setInputInState(this.self(), value, cursor); }
    setPlanNudgesEnabled(enabled: boolean): void { setPlanNudgesEnabledInState(this.self(), enabled); }
    setInputCursor(cursor: number): void { setInputCursorInState(this.self(), cursor); }
    moveInputCursor(delta: number): void { moveInputCursorInState(this.self(), delta); }
    moveInputCursorToEdge(position: 'start' | 'end'): void { moveInputCursorToEdgeInState(this.self(), position); }
    moveInputCursorByWord(delta: number): void { moveInputCursorByWordInState(this.self(), delta); }
    deleteInputWord(direction: -1 | 1): void { deleteInputWordInState(this.self(), direction); }
    killInputToEdge(edge: 'start' | 'end'): void { killInputToEdgeInState(this.self(), edge); }
    setMessagesFocused(focused: boolean): void { setMessagesFocusedInState(this.self(), focused); }
    setTranscriptFollowProvider(provider?: () => boolean): void { setTranscriptFollowProviderInState(this.self(), provider); }
    syncTranscriptFollowing(): void { syncTranscriptFollowingInState(this.self()); }
    setInputPlaceholder(value: string): void { setInputPlaceholderInState(this.self(), value); }
    setPendingAttachments(attachments: AgentConsolePendingAttachment[]): void { setPendingAttachmentsInState(this.self(), attachments); }
    appendPendingAttachment(attachment: AgentConsolePendingAttachment): void { appendPendingAttachmentInState(this.self(), attachment); }
    clearPendingAttachments(): void { clearPendingAttachmentsInState(this.self()); }
}

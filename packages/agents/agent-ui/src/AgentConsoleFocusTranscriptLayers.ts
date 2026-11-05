import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import { AgentConsoleFocusReviewLayers } from './AgentConsoleFocusReviewLayers';

/** Transcript inspector, message detail and message-list key routing. */
export abstract class AgentConsoleFocusTranscriptLayers extends AgentConsoleFocusReviewLayers {
    protected abstract readonly state: AgentConsoleSessionState;
    abstract isDismissKey(key: string): boolean;
    abstract dismiss(transcriptNavigation: AgentConsoleTranscriptNavigationController): Promise<boolean>;

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
        await this.state.copyFocusedTextAction?.(this.state.timelineEventDetailLines.join('\n'), this.state.translateLabel('agent.notice.copyLabelTimelineEvent', undefined, 'timeline event'));
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
        await this.state.copyFocusedTextAction?.(this.state.selectedMessage?.content || '', this.state.translateLabel('agent.notice.copyLabelSelectedMessage', undefined, 'selected message'));
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
            case 'e': return state.toggleSelectedMessageExpanded();
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
}

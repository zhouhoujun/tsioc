import type { AgentMessage } from '@tsdi/agent';

export interface AgentConsoleTranscriptNavigationState {
    readonly displayMessages: AgentMessage[];
    selectedMessageId: string;
    messagesFocused: boolean;
    messageDetailScroll: number;
    messageDetailColumnScroll: number;
    messagesNewCount: number;
    timelineEventInspectorOpen: boolean;
    selectedTimelineEventId: string;
    timelineEventDetailScroll: number;
    timelineEventDetailColumnScroll: number;
    messageDetailOpen: boolean;
    focusController: { sync(): void };
    readonly consoleOptions: { messageSelectionPageSize?: number };
}

export abstract class AgentConsoleTranscriptNavigationController {
    constructor(protected readonly state: AgentConsoleTranscriptNavigationState) {}

    setFocused(focused: boolean): void {
        const state = this.state;
        state.messagesFocused = focused;
        const messages = state.displayMessages;
        if (focused && !state.selectedMessageId && messages.length) state.selectedMessageId = messages[messages.length - 1].id;
        if (!focused) {
            state.messagesNewCount = 0;
            state.timelineEventInspectorOpen = false;
            state.selectedTimelineEventId = '';
            state.timelineEventDetailScroll = 0;
            state.timelineEventDetailColumnScroll = 0;
            state.messageDetailOpen = false;
            state.messageDetailScroll = 0;
            state.messageDetailColumnScroll = 0;
        }
        state.focusController.sync();
    }

    move(delta: number): void {
        const messages = this.state.displayMessages;
        if (!messages.length) return;
        const current = Math.max(0, messages.findIndex(item => item.id === this.state.selectedMessageId));
        this.select(messages[(current + delta + messages.length) % messages.length].id);
    }

    movePage(delta: number, pageSize?: number): void {
        const messages = this.state.displayMessages;
        if (!messages.length) return;
        const current = Math.max(0, messages.findIndex(item => item.id === this.state.selectedMessageId));
        const size = Math.max(1, pageSize ?? this.state.consoleOptions.messageSelectionPageSize ?? 1);
        const next = Math.max(0, Math.min(messages.length - 1, current + (delta * size)));
        this.select(messages[next].id);
    }

    selectFirst(): void { const message = this.state.displayMessages[0]; if (message) this.select(message.id); }
    selectLast(): void {
        const messages = this.state.displayMessages; const message = messages[messages.length - 1]; if (message) this.select(message.id);
    }
    selectLastUser(): void {
        const messages = this.state.displayMessages;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index];
            if (String(message.role || '').toLowerCase() === 'user' && message.metadata?.kind !== 'steer' && String(message.content || '').trim()) {
                this.select(message.id); return;
            }
        }
    }

    scroll(delta: number): boolean {
        const messages = this.state.displayMessages;
        if (!messages.length) return false;
        if (delta < 0) {
            if (!this.state.messagesFocused) this.setFocused(true);
            this.movePage(-1, 1); return true;
        }
        if (!this.state.messagesFocused) return false;
        this.movePage(1, 1);
        if (this.state.selectedMessageId === messages[messages.length - 1].id) this.setFocused(false);
        return true;
    }

    protected select(messageId: string): void {
        this.state.selectedMessageId = messageId;
        this.state.messageDetailScroll = 0;
        this.state.messageDetailColumnScroll = 0;
    }
}

export class DefaultAgentConsoleTranscriptNavigationController extends AgentConsoleTranscriptNavigationController {}

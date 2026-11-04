import type { AgentConsolePendingAttachment, AgentConsoleSessionState } from './AgentConsoleSessionState';

export function setInput(state: AgentConsoleSessionState, value: string, cursor = value.length): void {
        state.input = value;
        state.inputCursor = state.clampCursor(state.input, cursor);
        state.refreshInputSuggestions();
        state.syncDerivedInputFocus();
    }

export function setPlanNudgesEnabled(state: AgentConsoleSessionState, enabled: boolean): void {
        state.planNudgesEnabled = enabled;
    }

export function setInputCursor(state: AgentConsoleSessionState, cursor: number): void {
        state.inputCursor = state.clampCursor(state.input, cursor);
        state.refreshInputSuggestions();
        state.syncDerivedInputFocus();
    }

export function moveInputCursor(state: AgentConsoleSessionState, delta: number): void {
        state.suppressSuggestionMenu = true;
        state.setInputCursor(state.inputCursor + delta);
    }

export function moveInputCursorToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
        state.suppressSuggestionMenu = true;
        state.setInputCursor(position === 'start' ? 0 : state.input.length);
    }

export function setMessagesFocused(state: AgentConsoleSessionState, focused: boolean): void {
        state.messagesFocused = !!focused;
        state.syncDerivedInputFocus();
    }

export function setTranscriptFollowProvider(state: AgentConsoleSessionState, provider?: () => boolean): void {
        state.transcriptFollowProvider = provider;
    }

export function syncTranscriptFollowing(state: AgentConsoleSessionState): void {
        const following = state.transcriptFollowProvider ? state.transcriptFollowProvider() : true;
        state.transcriptFollowing = following;
        if (following) {
            state.messagesNewCount = 0;
        }
    }

export function setInputPlaceholder(state: AgentConsoleSessionState, value: string): void {
        state.inputPlaceholder = String(value || '').trim();
    }

export function setPendingAttachments(state: AgentConsoleSessionState, attachments: AgentConsolePendingAttachment[]): void {
        state.pendingAttachments = attachments.slice();
    }

export function appendPendingAttachment(state: AgentConsoleSessionState, attachment: AgentConsolePendingAttachment): void {
        state.pendingAttachments = [...state.pendingAttachments, attachment];
    }

export function clearPendingAttachments(state: AgentConsoleSessionState): void {
        if (!state.pendingAttachments.length) {
            return;
        }
        state.pendingAttachments = [];
    }

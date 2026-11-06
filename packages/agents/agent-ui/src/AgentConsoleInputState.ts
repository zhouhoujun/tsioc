import { nextWordEnd, previousWordStart } from '@tsdi/components/common';
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

export function moveInputCursorByWord(state: AgentConsoleSessionState, delta: number): void {
        state.suppressSuggestionMenu = true;
        const cursor = delta < 0
            ? previousWordStart(state.input, state.inputCursor)
            : nextWordEnd(state.input, state.inputCursor);
        state.setInputCursor(cursor);
    }

export function deleteInputWord(state: AgentConsoleSessionState, direction: -1 | 1): void {
        const value = state.input;
        const cursor = state.inputCursor;
        if (direction < 0) {
            const start = previousWordStart(value, cursor);
            state.setInput(`${value.slice(0, start)}${value.slice(cursor)}`, start);
            return;
        }
        const end = nextWordEnd(value, cursor);
        state.setInput(`${value.slice(0, cursor)}${value.slice(end)}`, cursor);
    }

export function killInputToEdge(state: AgentConsoleSessionState, edge: 'start' | 'end'): void {
        if (edge === 'start') {
            state.setInput(state.input.slice(state.inputCursor), 0);
            return;
        }
        state.setInput(state.input.slice(0, state.inputCursor), state.inputCursor);
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

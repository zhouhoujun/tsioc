import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import { AgentConsoleSessionMetaHost } from './AgentConsoleSessionMetaHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { handleJobsFocusedKey, handleTasksFocusedKey, handleToolRunsFocusedKey, handleToolsFocusedKey } from './AgentConsoleFocusedPanelKeys';
import { processDecodedInput } from './AgentConsoleDecodedInputState';
import type { AgentConsoleInputHistoryController } from './AgentConsoleInputHistory';
import type { ConsoleTextChunk, ConsoleTextInputChunkOptions, ConsoleTextInputChunkResult } from './console-ports';
import { clampCommonTextCursor, processCommonTextInputChunk } from '@tsdi/components/common';

/** Focus-key routing and raw/decoded input processing facade. */
export abstract class AgentConsoleSessionInputProcessingHost extends AgentConsoleSessionMetaHost {
    protected abstract self(): AgentConsoleSessionState;
    abstract readonly inputHistoryController: AgentConsoleInputHistoryController;
    abstract expandTabs(value: string): string;
    abstract refreshInputSuggestions(): void;
    abstract acceptSelectMenu(value?: string): Promise<{ value: string | undefined; submitted: boolean }>;

    async handleFocusKey(key: string, transcriptNavigationController: AgentConsoleTranscriptNavigationController): Promise<boolean> {
        const normalized = String(key || '').trim().toLowerCase();
        if (!normalized) {
            return false;
        }
        const questionResult = this.focusLayers.handlePendingQuestionKey(normalized);
        if (questionResult !== undefined) return questionResult;
        const commandOutputsResult = this.focusLayers.handleCommandOutputsKey(normalized, transcriptNavigationController);
        if (commandOutputsResult !== undefined) return commandOutputsResult;
        const textOverlayResult = this.focusLayers.handleTextOverlayKey(normalized, transcriptNavigationController);
        if (textOverlayResult !== undefined) return textOverlayResult;
        const gitSnapshotResult = this.focusLayers.handleGitSnapshotKey(normalized, transcriptNavigationController);
        if (gitSnapshotResult !== undefined) return gitSnapshotResult;
        const reviewResult = this.focusLayers.handleReviewKey(normalized, transcriptNavigationController);
        if (reviewResult !== undefined) return reviewResult;
        const timelineInspectorResult = this.focusLayers.handleTimelineInspectorKey(normalized, transcriptNavigationController);
        if (timelineInspectorResult !== undefined) return timelineInspectorResult;
        const messageDetailResult = this.focusLayers.handleMessageDetailKey(normalized, transcriptNavigationController);
        if (messageDetailResult !== undefined) return messageDetailResult;
        const messageListResult = this.focusLayers.handleMessageListKey(normalized, transcriptNavigationController);
        if (messageListResult !== undefined) return messageListResult;
        const approvalResult = this.focusLayers.handleApprovalKey(normalized, transcriptNavigationController);
        if (approvalResult !== undefined) return approvalResult;
        if (this.tasksFocused) {
            return handleTasksFocusedKey(this.self(), normalized, transcriptNavigationController);
        }
        if (this.jobsFocused) {
            return handleJobsFocusedKey(this.self(), normalized, transcriptNavigationController);
        }
        if (this.toolsFocused) {
            return handleToolsFocusedKey(this.self(), normalized, transcriptNavigationController);
        }
        if (this.toolRunsFocused) {
            return handleToolRunsFocusedKey(this.self(), normalized, transcriptNavigationController);
        }
        if (this.sessionsFocused) {
            return (await this.focusLayers.handleSessionsKey(normalized, transcriptNavigationController)) ?? false;
        }
        return false;
    }

    async processRawChunk(
        chunk: string,
        options: { submitOnEnter?: boolean; ctrlKey?: boolean; altKey?: boolean; hasSelectMenu?: boolean } = {}
    ): Promise<{ submitted: boolean; confirmedSelection: boolean }> {
        const next = this.processInputChunk(this.input, this.inputCursor, chunk, options);
        this.input = this.expandTabs(next.value);
        this.inputCursor = this.clampCursor(this.input, next.cursor);
        this.inputHistoryController.resetNavigation();
        let submitted = next.shouldSubmit;

        if (next.shouldConfirmSelection && this.selectMenu) {
            const accepted = await this.acceptSelectMenu();
            submitted = submitted || accepted.submitted;
        } else {
            this.refreshInputSuggestions();
            if (next.shouldSubmit && this.submitAction) {
                void this.submitAction();
            }
        }

        return {
            submitted,
            confirmedSelection: next.shouldConfirmSelection
        };
    }

    async processDecodedInput(
        decoded: { text: string; controlKey?: string; partial?: boolean },
        chunk: ConsoleTextChunk,
        options: {
            isClosed: boolean;
            onExit: (force?: boolean) => void;
            hasActiveTextPrompt: boolean;
            lastRenderedLines?: string[];
            transcriptNavigationController: AgentConsoleTranscriptNavigationController;
        }
    ): Promise<{ handled: boolean; action?: string; value?: string }> {
        return processDecodedInput(this.self(), decoded, chunk, options);
    }

    clampCursor(value: string, cursor: number): number {
        return clampCommonTextCursor(value, cursor);
    }

    formatStatusFooter(model: string, profile: string, workspace: string): string {
        const parts = [model, profile, workspace].filter(Boolean);
        return parts.join(' · ') || 'idle';
    }

    processInputChunk(
        value: string,
        cursor: number,
        chunk: Uint8Array | string,
        options?: ConsoleTextInputChunkOptions
    ): ConsoleTextInputChunkResult {
        return processCommonTextInputChunk(value, cursor, chunk, options);
    }

    updateDraft(draft: string, cursor?: number): void {
        this.input = draft;
        this.inputCursor = this.clampCursor(draft, cursor ?? draft.length);
    }

    applyChunkToDraft(chunk: string, cursor: number): { value: string; cursor: number } {
        const next = this.processInputChunk(this.input, cursor, chunk);
        this.input = next.value;
        this.inputCursor = this.clampCursor(this.input, next.cursor);
        return next;
    }
}

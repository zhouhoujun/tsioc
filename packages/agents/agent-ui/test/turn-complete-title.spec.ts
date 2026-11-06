import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { AgentConsoleTurnInputHost, submitView } from '../src/AgentConsoleTurnInputController';

/**
 * A real TUI turn marked the state idle from the runtime's turn-completed
 * event, then the submit finally block skipped `updateTerminalTitle()` because
 * the status was no longer `running`. The terminal title kept saying Working
 * after the final answer. The title must be refreshed regardless of which
 * layer moved the status to idle.
 */
@Suite('turn completion refreshes the terminal title')
export class TurnCompleteTitleTest {
    @Test('title refreshes when runtime already set idle before submit resolves')
    async titleRefreshesWhenRuntimeAlreadySetIdle() {
        const state = new AgentConsoleSessionState();
        state.input = 'Reply with exactly: ok';
        state.sessionId = 'session-title';
        let titleUpdates = 0;
        const host = {
            state,
            draftLines: [],
            multilineMode: false,
            shellMultilineMode: false,
            shellDraftLines: [],
            editTargetMessageId: '',
            lastEditSessionMessageId: '',
            editDismissedAt: 0,
            activeTurnRun: null,
            scheduler: { getTasks: () => [] },
            isTurnInProgress: () => false,
            isSteerModeEnabled: () => false,
            isQueueModeEnabled: () => false,
            notifyBusyState: () => undefined,
            enrichPromptWithMentions: async (input: string) => input,
            buildTurnMessageInput: () => undefined,
            consumePendingTurnModelProfile: () => undefined,
            persistInputHistory: async () => undefined,
            clearStreamingMessageState: () => undefined,
            updateTerminalTitle: () => { titleUpdates += 1; },
            // The local event bridge handles turn_completed while the stream is
            // still unwinding, so the submit path sees an already-idle status.
            runTurnStream: async () => { state.setStatus('idle'); },
            ensureMessageAtTail: () => undefined,
            advanceProviderWizard: async () => undefined,
            notify: () => undefined,
            handleShellBang: async () => false,
            handleCommand: async () => false,
            interruptTurn: async () => undefined,
            enqueuePrompt: () => undefined,
            openSession: async () => undefined,
            resolveMentionDisplayFiles: () => [],
            refreshTurnArtifacts: async () => undefined,
            drainQueuedPrompts: async () => undefined
        } as unknown as AgentConsoleTurnInputHost;

        await submitView(host);

        expect(state.status).toEqual('idle');
        // One update when the turn starts, plus one after the stream unwinds.
        expect(titleUpdates).toBeGreaterThanOrEqual(2);
    }
}

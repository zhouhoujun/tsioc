import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    reduceAgentConsoleCommandExecution,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    InMemoryCommandExecutionControl,
    AgentConsoleCommandExecution,
    normalizeCommandExchangeEnvelope,
    commandExchangeKey
} from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';

function createState(): AgentConsoleSessionState {
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
}

@Suite('P283 command exchange reducer')
export class P283CommandExchangeReducerTest {

    @Test('begin stamps sequence, attempt=1, and sessionEpoch on fresh entry')
    beginStampsEnvelopeFields() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/usage', '', 'session-A', Date.now(), 7, 3)
        );
        expect(state.length).toEqual(1);
        expect(state[0].sequence).toEqual(7);
        expect(state[0].attempt).toEqual(1);
        expect(state[0].sessionEpoch).toEqual(3);
        expect(state[0].status).toEqual('running');
    }

    @Test('retry increments attempt and resets to running without duplicating')
    retryIncrementsAttempt() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/usage', 'old', 'session-A', 1000, 1, 1)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createCompleteCommandExecutionAction('cmd-1', 'succeeded', 2000)
        );
        expect(state[0].status).toEqual('succeeded');

        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/usage', 'new', 'session-A', 3000, 5, 2)
        );
        expect(state.length).toEqual(1);
        expect(state[0].attempt).toEqual(2);
        expect(state[0].status).toEqual('running');
        expect(state[0].args).toEqual('new');
        expect(state[0].sequence).toEqual(5);
        expect(state[0].sessionEpoch).toEqual(2);
        expect(state[0].finishedAt).toBeUndefined();
        expect(state[0].error).toBeUndefined();
        expect(state[0].outputIds).toEqual([]);
    }

    @Test('retry after failed also increments attempt')
    retryAfterFailedIncrementsAttempt() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/search', 'q', 's', 1000, 1, 0)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createFailCommandExecutionAction('cmd-1', 'network error', true, 2000)
        );
        expect(state[0].status).toEqual('failed');

        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/search', 'q', 's', 3000, 4, 0)
        );
        expect(state.length).toEqual(1);
        expect(state[0].attempt).toEqual(2);
        expect(state[0].status).toEqual('running');
        expect(state[0].error).toBeUndefined();
        expect(state[0].retryable).toBeUndefined();
    }

    @Test('retry after cancelled also increments attempt')
    retryAfterCancelledIncrementsAttempt() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/ping', '', 's', 1000, 1, 0)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createCompleteCommandExecutionAction('cmd-1', 'cancelled', 2000)
        );
        expect(state[0].status).toEqual('cancelled');

        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/ping', '', 's', 3000, 2, 0)
        );
        expect(state[0].attempt).toEqual(2);
        expect(state[0].status).toEqual('running');
    }

    @Test('begin with same requestId while running is a no-op')
    duplicateRunningIsNoOp() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/usage', '', 'session-A', 1000, 1, 0)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/usage', '', 'session-A', 2000, 2, 1)
        );
        expect(state.length).toEqual(1);
        expect(state[0].attempt).toEqual(1);
        expect(state[0].sequence).toEqual(1);
    }

    @Test('sequence is monotonically increasing across distinct entries')
    sequenceMonotonicallyIncreasing() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/a', '', 's', Date.now(), 1, 0)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-2', '/b', '', 's', Date.now(), 2, 0)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-3', '/c', '', 's', Date.now(), 3, 0)
        );
        expect(state[0].sequence).toEqual(3);
        expect(state[1].sequence).toEqual(2);
        expect(state[2].sequence).toEqual(1);
    }

    @Test('complete and fail still ignore terminal entries')
    completeStillIgnoresTerminal() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/x', '', 's', Date.now(), 1, 0)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createCompleteCommandExecutionAction('cmd-1', 'succeeded', Date.now())
        );
        const terminal = state[0];
        state = reduceAgentConsoleCommandExecution(
            state,
            createFailCommandExecutionAction('cmd-1', 'late', true, Date.now())
        );
        expect(state[0]).toBe(terminal);
        expect(state[0].status).toEqual('succeeded');
    }

    @Test('retry clears outputIds from previous attempt')
    retryClearsOutputIds() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/x', '', 's', Date.now(), 1, 0)
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            { type: 'linkOutput', requestId: 'cmd-1', outputId: 'out-1' }
        );
        expect(state[0].outputIds).toEqual(['out-1']);

        state = reduceAgentConsoleCommandExecution(
            state,
            createCompleteCommandExecutionAction('cmd-1', 'cancelled', Date.now())
        );
        state = reduceAgentConsoleCommandExecution(
            state,
            createBeginCommandExecutionAction('cmd-1', '/x', '', 's', Date.now(), 2, 0)
        );
        expect(state[0].outputIds).toEqual([]);
        expect(state[0].attempt).toEqual(2);
    }
}

@Suite('P283 session state envelope wiring')
export class P283SessionStateEnvelopeWiringTest {

    @Test('beginCommandExecution assigns monotonically increasing sequence')
    beginAssignsMonotonicSequence() {
        const state = createState();
        const r1 = state.commandExecutionController.begin('/usage', '');
        const r2 = state.commandExecutionController.begin('/status', '');
        const e1 = state.commandExecutions.find(e => e.requestId === r1);
        const e2 = state.commandExecutions.find(e => e.requestId === r2);
        expect(e2!.sequence).toBeGreaterThan(e1!.sequence);
        expect(e1!.attempt).toEqual(1);
        expect(e2!.attempt).toEqual(1);
    }

    @Test('session switch increments commandExchangeSessionEpoch')
    sessionSwitchIncrementsEpoch() {
        const state = createState();
        state.configure({ sessionId: 'A' } as any);
        state.commandExecutionController.begin('/ping', '');
        const e1 = state.commandExecutions[0];
        expect(e1.sessionEpoch).toEqual(1);

        state.configure({ sessionId: 'B' } as any);
        expect(state.commandExecutions.length).toEqual(0);

        state.commandExecutionController.begin('/ping', '');
        const e2 = state.commandExecutions[0];
        expect(e2.sessionEpoch).toEqual(2);
        expect(e2.attempt).toEqual(1);
    }

    @Test('syncCommandExecutionTranscript projects sequence and attempt')
    transcriptProjectsSequenceAndAttempt() {
        const state = createState();
        state.configure({ sessionId: 'A' } as any);
        state.commandExecutionController.begin('/usage', '');
        const msg = state.displayMessages.find(m => m.metadata?.uiKind === 'command-execution');
        expect(msg).toBeDefined();
        expect(msg?.metadata?.sequence).toEqual(1);
        expect(msg?.metadata?.attempt).toEqual(1);
    }

    @Test('two separate beginCommandExecution calls produce two distinct entries')
    separateBeginsProduceDistinctEntries() {
        const state = createState();
        state.configure({ sessionId: 'A' } as any);
        const r1 = state.commandExecutionController.begin('/search', 'q');
        state.commandExecutionController.fail(r1, 'timeout', true);
        expect(state.latestCommandExecution?.status).toEqual('failed');

        const r2 = state.commandExecutionController.begin('/search', 'q');
        expect(state.commandExecutions.length).toEqual(2);
        expect(state.latestCommandExecution?.attempt).toEqual(1);
        expect(state.latestCommandExecution?.status).toEqual('running');
        expect(state.latestCommandExecution?.requestId).toEqual(r2);
    }
}

@Suite('P283 CommandExchangeEnvelope normalization')
export class P283CommandExchangeEnvelopeTest {

    @Test('normalizeCommandExchangeEnvelope trims and defaults sequence to 0')
    normalizeAndTrimsSequence() {
        const result = normalizeCommandExchangeEnvelope({
            kind: 'command',
            sequence: NaN,
            sessionEpoch: 1,
            key: '  cmd-1  ',
            content: '  /usage running  ',
            sessionId: '  s1  '
        } as any);
        expect(result.key).toEqual('cmd-1');
        expect(result.content).toEqual('/usage running');
        expect(result.sessionId).toEqual('s1');
        expect(result.sequence).toEqual(0);
    }

    @Test('commandExchangeKey produces kind:identity format')
    exchangeKeyFormat() {
        expect(commandExchangeKey('tool', 'tc-1')).toEqual('tool:tc-1');
        expect(commandExchangeKey('command', '')).toEqual('');
    }
}

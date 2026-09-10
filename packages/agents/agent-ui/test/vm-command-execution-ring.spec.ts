import expect = require('expect');
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createReadStream } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { AudioCaptureAdapter, AudioCaptureSessionEvents, AudioPlaybackAdapter, AudioPlaybackOptions, Encodings, FileAdapter, FileDirectoryEntry, IReadable } from '@tsdi/common';
import {
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentCompensationEvent,
    MemoryStore,
    AgentModelCompletedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent,
    InMemoryCommandExecutionControl,
    normalizeAgentWorkspaceIdentity
} from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleInputHistoryStore,
    AgentConsoleInputPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleApprovalRequest,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    AgentConsoleSessionChoice,
    AgentConsoleSessionProjectGroup,
    AgentConsoleWorkspaceMentionsProvider,
    AgentConsoleKeymap,
    AgentConsoleKeymapStore,
    AgentConsoleSettingsStore,
    AgentConsoleThemeStore,
    agentConsoleThemes,
    AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP,
    AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP,
    reduceAgentConsoleCommandExecution,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    createLinkCommandOutputAction,
    AgentConsoleCommandExecution
} from '../src';
import { runAgentUiOrmApp } from '../testing/agent-orm';
import {
    TestFileAdapter,
    AudioCaptureStub,
    AudioPlaybackStub,
    RuntimeStub,
    FailingRuntimeStub,
    SchedulerStub,
    ToolRegistryStub,
    EventMulticasterStub,
    ApplicationContextStub,
    AppRpcStub,
    SessionServiceStub,
    createDeferred,
    createConsole,
    createConsoleParts
} from './_helpers';

@Suite('Agent console command executions ring (P265)')
export class VmCommandExecutionsRingTest {
    protected createState(): AgentConsoleSessionState {
        return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    }

    @Test('reducer begin transitions to running and records canonical command, args, and sessionId')
    async reducerBegin() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(state, createBeginCommandExecutionAction('cmd-1', '/usage', '', 'session-A'));
        expect(state.length).toEqual(1);
        expect(state[0].requestId).toEqual('cmd-1');
        expect(state[0].command).toEqual('/usage');
        expect(state[0].status).toEqual('running');
        expect(state[0].sessionId).toEqual('session-A');
        expect(state[0].startedAt).toBeGreaterThan(0);
    }

    @Test('reducer complete transitions running to succeeded and stamps finishedAt')
    async reducerComplete() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(state, createBeginCommandExecutionAction('cmd-1', '/usage', '', 'session-A'));
        state = reduceAgentConsoleCommandExecution(state, createCompleteCommandExecutionAction('cmd-1', 'succeeded'));
        expect(state[0].status).toEqual('succeeded');
        expect(state[0].finishedAt).toBeGreaterThanOrEqual(state[0].startedAt);
    }

    @Test('reducer fail records retryable with an error message')
    async reducerFail() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(state, createBeginCommandExecutionAction('cmd-1', '/status', '', 'session-A'));
        state = reduceAgentConsoleCommandExecution(state, createFailCommandExecutionAction('cmd-1', 'boom', true));
        expect(state[0].status).toEqual('failed');
        expect(state[0].retryable).toEqual(true);
        expect(state[0].error).toEqual('boom');
    }

    @Test('reducer ignores transitions that target a non-running terminal execution')
    async reducerIgnoresChangesAfterTerminal() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(state, createBeginCommandExecutionAction('cmd-1', '/usage', '', 'session-A'));
        state = reduceAgentConsoleCommandExecution(state, createCompleteCommandExecutionAction('cmd-1', 'succeeded'));
        const terminal = state[0];
        state = reduceAgentConsoleCommandExecution(state, createFailCommandExecutionAction('cmd-1', 'late', true));
        expect(state[0]).toBe(terminal);
        expect(state[0].status).toEqual('succeeded');
        expect(state[0].error).toBeUndefined();
    }

    @Test('reducer linkOutput appends an output id and no-ops for an unknown request')
    async reducerLinkOutput() {
        let state: AgentConsoleCommandExecution[] = [];
        state = reduceAgentConsoleCommandExecution(state, createBeginCommandExecutionAction('cmd-1', '/usage', '', 'session-A'));
        state = reduceAgentConsoleCommandExecution(state, createLinkCommandOutputAction('cmd-1', 'output-1'));
        state = reduceAgentConsoleCommandExecution(state, createLinkCommandOutputAction('cmd-1', 'output-2'));
        expect(state[0].outputIds).toEqual(['output-1', 'output-2']);
        state = reduceAgentConsoleCommandExecution(state, createLinkCommandOutputAction('cmd-nope', 'output-3'));
        expect(state[0].outputIds).toEqual(['output-1', 'output-2']);
    }

    @Test('reducer keeps the most recent executions and caps the ring at AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP')
    async reducerRingCap() {
        let state: AgentConsoleCommandExecution[] = [];
        for (let i = 0; i < AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP + 5; i++) {
            state = reduceAgentConsoleCommandExecution(state, createBeginCommandExecutionAction(`cmd-${i}`, '/usage', '', 'session-A'));
        }
        expect(state.length).toEqual(AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP);
        expect(state[0].requestId).toEqual(`cmd-${AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP + 4}`);
        expect(state[state.length - 1].requestId).toEqual(`cmd-${5}`);
    }

    @Test('state begin/complete/fail/link methods route through the reducer and expose latest')
    async stateMethodsRouteThroughReducer() {
        const state = this.createState();
        const requestId = state.beginCommandExecution('/usage', '');
        expect(state.commandExecutions.length).toEqual(1);
        expect(state.latestCommandExecution?.status).toEqual('running');
        expect(state.displayMessages.find(item => item.metadata?.uiKind === 'command-execution')?.content).toEqual('/usage running');
        state.completeCommandExecution(requestId, 'succeeded');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
        expect(state.latestCommandExecution?.requestId).toEqual(requestId);
        expect(state.displayMessages.filter(item => item.metadata?.uiKind === 'command-execution').length).toEqual(1);
        expect(state.displayMessages.find(item => item.metadata?.uiKind === 'command-execution')?.content).toEqual('/usage completed');

        const requestId2 = state.beginCommandExecution('/status', '');
        expect(state.latestCommandExecution?.requestId).toEqual(requestId2);
        const outputId = state.pushCommandOutput('/usage', 'tokens 100');
        state.linkCommandOutputToExecution(requestId2, outputId);
        expect(state.latestCommandExecution?.outputIds).toContain(outputId);
    }

    @Test('state configure with a new sessionId clears executions without reusing request ids')
    async stateConfigureClearsOnSessionSwitch() {
        const state = this.createState();
        state.beginCommandExecution('/usage', '');
        expect(state.commandExecutions.length).toEqual(1);
        state.configure({ sessionId: 'session-B' } as any);
        expect(state.commandExecutions.length).toEqual(0);
        const after = state.beginCommandExecution('/status', '');
        expect(state.commandExecutions.length).toEqual(1);
        expect(state.latestCommandExecution?.command).toEqual('/status');
        expect(after).toEqual('cmd-2');
    }

    @Test('session switch cancels active command execution and rejects its stale completion')
    async sessionSwitchRejectsStaleCommandResult() {
        const state = this.createState();
        state.configure({ sessionId: 'session-A' } as any);
        const staleRequest = state.beginCommandExecution('/search', 'old');
        expect(state.isCommandExecutionCurrent(staleRequest)).toEqual(true);
        const staleSignal = state.getCommandExecutionSignal(staleRequest);
        state.configure({ sessionId: 'session-B' } as any);
        expect(staleSignal?.aborted).toEqual(true);
        expect(state.isCommandExecutionCurrent(staleRequest)).toEqual(false);
        state.completeCommandExecution(staleRequest, 'succeeded');
        expect(state.commandExecutions.length).toEqual(0);

        const currentRequest = state.beginCommandExecution('/search', 'new');
        state.completeCommandExecution(currentRequest, 'succeeded');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
    }

    @Test('state delegates command cancellation and staleness to the injected control port')
    async stateUsesInjectedCommandExecutionControl() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const calls: string[] = [];
        const signal = { aborted: false } as AbortSignal;
        state.setCommandExecutionControl({
            begin: (requestId) => { calls.push(`begin:${requestId}`); return signal; },
            signal: (requestId) => { calls.push(`signal:${requestId}`); return signal; },
            isCurrent: (requestId) => { calls.push(`current:${requestId}`); return true; },
            finish: (requestId) => calls.push(`finish:${requestId}`),
            cancel: (requestId) => calls.push(`cancel:${requestId}`),
            cancelSession: (sessionId) => calls.push(`session:${sessionId}`)
        });
        const requestId = state.beginCommandExecution('/status', '');
        expect(state.getCommandExecutionSignal(requestId)).toBe(signal);
        state.completeCommandExecution(requestId, 'succeeded');
        expect(calls).toContain(`begin:${requestId}`);
        expect(calls).toContain(`signal:${requestId}`);
        expect(calls).toContain(`current:${requestId}`);
        expect(calls).toContain(`finish:${requestId}`);
    }
}

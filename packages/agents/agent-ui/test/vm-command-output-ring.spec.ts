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

@Suite('Agent console command outputs ring (P262)')
export class VmCommandOutputsRingTest {

    @Test('pushCommandOutput prepends entries and caps the ring at AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP')
    async pushCommandOutputCapsRing() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        for (let i = 0; i < AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP + 5; i++) {
            state.pushCommandOutput(`/cmd-${i}`, `output ${i}`);
        }
        expect(state.commandOutputs.length).toEqual(AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP);
        expect(state.commandOutputs[0].command).toEqual(`/cmd-${AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP + 4}`);
        expect(state.commandOutputs[state.commandOutputs.length - 1].command).toEqual(`/cmd-${5}`);
        expect(state.commandOutputs.every(entry => entry.id.startsWith('output-'))).toEqual(true);
    }

    @Test('pushCommandOutput trims text and drops entries with empty command or body')
    async pushCommandOutputTrimsAndDropsEmpty() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.pushCommandOutput('/usage', '  tokens 100  ');
        expect(state.commandOutputs.length).toEqual(1);
        expect(state.commandOutputs[0].text).toEqual('tokens 100');
        state.pushCommandOutput('/usage', '   ');
        state.pushCommandOutput('', 'text');
        state.pushCommandOutput('  ', 'text');
        expect(state.commandOutputs.length).toEqual(1);
    }

    @Test('visibleCommandOutputs filters by command and text, case-insensitive')
    async visibleCommandOutputsFilters() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.pushCommandOutput('/usage', 'tokens 100');
        state.pushCommandOutput('/quality', 'summary 92');
        state.pushCommandOutput('/hooks', 'beforeTurn');
        state.setCommandOutputsFilter('/usage');
        expect(state.visibleCommandOutputs.map(entry => entry.command)).toEqual(['/usage']);
        state.setCommandOutputsFilter('SUMMARY');
        expect(state.visibleCommandOutputs.map(entry => entry.command)).toEqual(['/quality']);
        state.setCommandOutputsFilter('');
        expect(state.visibleCommandOutputs.length).toEqual(3);
    }

    @Test('setCommandOutputsFilter caps the filter string and resets selection')
    async setCommandOutputsFilterCapsAndResets() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.pushCommandOutput('/usage', 'tokens 100');
        state.moveCommandOutputSelection(1);
        state.setCommandOutputsFilter('x'.repeat(100));
        expect(state.commandOutputsFilter.length).toEqual(64);
        expect(state.commandOutputsSelectedIndex).toEqual(0);
    }

    @Test('open/close/toggleCommandOutputs manage focus and reset filter and selection')
    async commandOutputsOpenCloseToggle() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.hasCommandOutputsFocus()).toEqual(false);
        state.openCommandOutputs();
        expect(state.commandOutputsOpen).toEqual(true);
        expect(state.hasCommandOutputsFocus()).toEqual(true);
        state.closeCommandOutputs();
        expect(state.commandOutputsOpen).toEqual(false);
        state.toggleCommandOutputs();
        expect(state.commandOutputsOpen).toEqual(true);
        state.setCommandOutputsFilter('usage');
        state.moveCommandOutputSelection(2);
        state.toggleCommandOutputs();
        expect(state.commandOutputsOpen).toEqual(false);
        expect(state.commandOutputsFilter).toEqual('');
        expect(state.commandOutputsSelectedIndex).toEqual(0);
    }

    @Test('moveCommandOutputSelection clamps to the visible entry count')
    async moveCommandOutputSelectionClamps() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.pushCommandOutput('/usage', 'tokens 100');
        state.pushCommandOutput('/quality', 'summary 92');
        state.moveCommandOutputSelection(-10);
        expect(state.commandOutputsSelectedIndex).toEqual(0);
        state.moveCommandOutputSelection(2);
        expect(state.commandOutputsSelectedIndex).toEqual(1);
        state.moveCommandOutputSelection(10);
        expect(state.commandOutputsSelectedIndex).toEqual(1);
        state.setCommandOutputsFilter('usage');
        state.moveCommandOutputSelection(10);
        expect(state.commandOutputsSelectedIndex).toEqual(0);
    }

    @Test('copySelectedCommandOutput copies the selected entry text through copyFocusedTextAction')
    async copySelectedCommandOutputCopies() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.pushCommandOutput('/usage', 'tokens 100');
        state.openCommandOutputs();
        const copies: Array<{ text: string; label: string }> = [];
        state.copyFocusedTextAction = (text, label) => { copies.push({ text, label }); };
        const ok = await state.copySelectedCommandOutput();
        expect(ok).toEqual(true);
        expect(copies.length).toEqual(1);
        expect(copies[0].text).toEqual('tokens 100');
        expect(copies[0].label).toEqual('command /usage output');
    }

    @Test('copySelectedCommandOutput returns false on an empty ring or missing action')
    async copySelectedCommandOutputEmptyRing() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openCommandOutputs();
        const okMissingAction = await state.copySelectedCommandOutput();
        expect(okMissingAction).toEqual(false);
        state.copyFocusedTextAction = () => { return; };
        state.pushCommandOutput('/usage', 'tokens 100');
        expect(await state.copySelectedCommandOutput()).toEqual(true);
    }
}


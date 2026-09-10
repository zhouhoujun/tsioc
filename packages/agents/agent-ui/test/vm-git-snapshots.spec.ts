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

@Suite('Agent console git snapshots')
export class VmGitSnapshotsTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('git-snapshots command diff opens the git snapshot detail panel through app rpc')
    async gitSnapshotsCommandDiffOpensDetailPanelThroughAppRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.gitStepSnapshotDiffs.set('msg-1', {
            ref: 'msg-1',
            files: [{ filePath: 'src/a.ts', status: 'modified' }],
            rawPatch: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await (component as any).openSession('chat-1');

        await (component as any).handleCommand('/git-snapshots diff msg-1');

        expect(component.sessionState.gitSnapshotOpen).toEqual(true);
        expect(component.sessionState.gitSnapshotDetailLines).toEqual(['diff --git a/src/a.ts b/src/a.ts', '+new line']);
        expect(component.sessionState.gitSnapshotHeaderLabel).toContain('msg-1');
        expect(component.sessionState.gitSnapshotStatsLabel).toContain('files 1');
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.diff' && call.params?.ref === 'msg-1')).toEqual(true);
    }

    @Test('git-snapshots command diff falls back to the local runtime without app rpc')
    async gitSnapshotsCommandDiffFallsBackToLocalRuntime() {
        const runtime = new RuntimeStub();
        (runtime as any).diffGitStepSnapshot = (sessionId: string, ref: string) => ({
            ref,
            files: [{ filePath: 'src/a.ts', status: 'modified' }],
            rawPatch: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
        });
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        await (component as any).openSession('chat-1');

        await (component as any).handleCommand('/git-snapshots diff msg-1');

        expect(component.sessionState.gitSnapshotOpen).toEqual(true);
        expect(component.sessionState.gitSnapshotDetailLines).toEqual(['diff --git a/src/a.ts b/src/a.ts', '+new line']);
    }

    @Test('git-snapshots command with no snapshots notifies without opening the panel')
    async gitSnapshotsCommandNoSnapshotsNotifiesWithoutOpeningPanel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await (component as any).openSession('chat-1');

        await (component as any).handleCommand('/git-snapshots');

        expect(component.sessionState.gitSnapshotOpen).toEqual(false);
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.list')).toEqual(true);
    }

    @Test('git snapshot diff renders the raw patch when present')
    async gitSnapshotDiffRendersRawPatchWhenPresent() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        const lines = (component as any).buildGitSnapshotDiffLines({
            rawPatch: 'diff --git a/src/a.ts b/src/a.ts\r\n+line one\r\n-line two\r\n'
        });

        expect(lines).toEqual(['diff --git a/src/a.ts b/src/a.ts', '+line one', '-line two']);
    }

    @Test('git snapshot diff renders file summaries when the raw patch is missing')
    async gitSnapshotDiffRendersFileSummariesWhenRawPatchMissing() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        const lines = (component as any).buildGitSnapshotDiffLines({
            files: [
                { filePath: 'src/a.ts', status: 'modified' },
                { path: 'src/b.ts', status: 'added' }
            ]
        });

        expect(lines).toEqual([
            'diff --git a/src/a.ts b/src/a.ts',
            'status: modified',
            'diff --git a/src/b.ts b/src/b.ts',
            'status: added'
        ]);
    }

    @Test('git snapshot state opens and closes the detail panel with scroll state')
    async gitSnapshotStateOpensAndClosesDetailPanel() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openGitSnapshotDetail('git snapshot msg-1', ['line 1', 'line 2', 'line 3', 'line 4', 'line 5', 'line 6', 'line 7', 'line 8', 'line 9', 'line 10'], 'files 1');

        expect(state.gitSnapshotOpen).toEqual(true);
        expect(state.gitSnapshotHeaderLabel).toEqual('git snapshot msg-1');
        expect(state.gitSnapshotStatsLabel).toEqual('files 1');

        state.scrollGitSnapshotDetail(1);
        expect(state.gitSnapshotDetailScroll).toEqual(1);

        state.closeGitSnapshotDetail();
        expect(state.gitSnapshotOpen).toEqual(false);
        expect(state.gitSnapshotDetailLines).toEqual([]);
        expect(state.gitSnapshotDetailScroll).toEqual(0);
    }
}

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

@Suite('Agent console voice')
export class VmVoiceTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('voice command reports gateway availability through rpc')
    async voiceCommandReportsAvailabilityThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'voice-1';
        await component.onInit();

        component.input = '/voice';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'audio.status' && call.params?.sessionId === 'voice-1')).toEqual(true);
        expect(component.notice).toContain('voice available');
        expect(component.notice).toContain('Usage: /voice start|stop|cancel|status');
    }

    @Test('voice status command reports active session and buffered bytes')
    async voiceStatusCommandReportsActiveSession() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.audioStatesBySession.set('voice-2', { bufferedBytes: 4096, chunks: ['AA=='] });
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'voice-2';
        await component.onInit();

        component.input = '/voice status';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'audio.status' && call.params?.sessionId === 'voice-2')).toEqual(true);
        expect(component.notice).toContain('voice available');
        expect(component.notice).toContain('session active');
        expect(component.notice).toContain('buffered 4096 bytes');
    }

    @Test('voice status command reports missing components when gateway unavailable')
    async voiceStatusCommandReportsMissingComponents() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.audioStatusOverride = {
            sessionId: 'voice-3',
            available: false,
            active: false,
            bufferedBytes: 0,
            missing: ['AudioCaptureAdapter', 'SpeechToTextAdapter']
        };
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'voice-3';
        await component.onInit();

        component.input = '/voice';
        await component.submit();

        expect(component.notice).toContain('voice unavailable');
        expect(component.notice).toContain('missing AudioCaptureAdapter, SpeechToTextAdapter');
        expect(component.notice).toContain('session inactive');
    }

    @Test('voice start command opens a voice session through rpc')
    async voiceStartCommandOpensVoiceSession() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'voice-4';
        await component.onInit();

        component.input = '/voice start';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'audio.start' && call.params?.sessionId === 'voice-4')).toEqual(true);
        expect(appRpc.audioStatesBySession.has('voice-4')).toEqual(true);
        expect(component.notice).toContain('Voice session started (voice-4)');
    }

    @Test('voice capture streams platform audio chunks before ending the gateway session')
    async voiceCaptureStreamsChunks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const capture = new AudioCaptureStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc, undefined, undefined, capture);
        state.sessionId = 'voice-capture';
        await component.onInit();

        component.input = '/voice start';
        await component.submit();
        capture.emit('hello');
        component.input = '/voice stop';
        await component.submit();

        expect(capture.starts).toBe(1);
        expect(capture.stops).toBe(1);
        expect(appRpc.calls.find(call => call.method === 'audio.start')?.params?.format).toBe('pcm16k');
        const feed = appRpc.calls.find(call => call.method === 'audio.feed');
        expect(Buffer.from(feed?.params?.chunk, 'base64').toString()).toBe('hello');
        expect(appRpc.calls.findIndex(call => call.method === 'audio.feed')).toBeLessThan(appRpc.calls.findIndex(call => call.method === 'audio.end'));
    }

    @Test('voice start rolls back the gateway session when platform capture is unavailable')
    async voiceCaptureUnavailableRollsBack() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const capture = new AudioCaptureStub();
        capture.available = false;
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc, undefined, undefined, capture);
        state.sessionId = 'voice-unavailable';
        await component.onInit();

        component.input = '/voice start';
        await component.submit();

        expect(appRpc.audioStatesBySession.has('voice-unavailable')).toBe(false);
        expect(appRpc.calls.some(call => call.method === 'audio.cancel')).toBe(true);
        expect(component.notice).toContain('microphone');
    }

    @Test('voice cancel aborts platform capture before cancelling the gateway session')
    async voiceCancelAbortsCapture() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const capture = new AudioCaptureStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc, undefined, undefined, capture);
        state.sessionId = 'voice-cancel-capture';
        await component.onInit();
        component.input = '/voice start';
        await component.submit();

        component.input = '/voice cancel';
        await component.submit();

        expect(capture.cancels).toBe(1);
        expect(appRpc.calls.findIndex(call => call.method === 'audio.cancel')).toBeGreaterThan(-1);
    }

    @Test('voice stop command transcribes and replies through rpc')
    async voiceStopCommandTranscribesAndReplies() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'voice-5';
        await component.onInit();

        component.input = '/voice start';
        await component.submit();

        component.input = '/voice stop';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'audio.end' && call.params?.sessionId === 'voice-5')).toEqual(true);
        expect(appRpc.audioStatesBySession.has('voice-5')).toEqual(false);
        expect(component.notice).toContain('Transcribed: hello voice input');
        expect(component.notice).toContain('Reply: voice reply from gateway');
    }

    @Test('voice stop plays synthesized RPC audio through the platform adapter')
    async voiceStopPlaysSynthesizedAudio() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const playback = new AudioPlaybackStub();
        const { state, component } = createConsoleParts(
            runtime, scheduler, new ToolRegistryStub(), undefined, undefined,
            undefined, undefined, appRpc, undefined, undefined, undefined, playback
        );
        state.sessionId = 'voice-playback';
        await component.onInit();
        component.input = '/voice start';
        await component.submit();

        component.input = '/voice stop';
        await component.submit();

        expect(playback.plays.length).toBe(1);
        expect(playback.plays[0].options.format).toBe('pcm16k');
        expect(Buffer.from(playback.plays[0].chunks[0]).toString()).toBe('voice audio');
    }

    @Test('voice stop preserves text reply when platform playback is unavailable')
    async voiceStopReportsPlaybackUnavailable() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const playback = new AudioPlaybackStub();
        playback.available = false;
        const { state, component } = createConsoleParts(
            runtime, scheduler, new ToolRegistryStub(), undefined, undefined,
            undefined, undefined, appRpc, undefined, undefined, undefined, playback
        );
        state.sessionId = 'voice-no-playback';
        await component.onInit();
        component.input = '/voice start';
        await component.submit();
        component.input = '/voice stop';
        await component.submit();

        expect(component.notice).toContain('Reply: voice reply from gateway');
        expect(component.notice).toContain('Audio playback unavailable: speaker');
    }

    @Test('voice cancel command cancels an active voice session')
    async voiceCancelCommandCancelsSession() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'voice-6';
        await component.onInit();

        component.input = '/voice start';
        await component.submit();

        component.input = '/voice cancel';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'audio.cancel' && call.params?.sessionId === 'voice-6')).toEqual(true);
        expect(appRpc.audioStatesBySession.has('voice-6')).toEqual(false);
        expect(component.notice).toContain('Voice session cancelled.');
    }

    @Test('voice command without a session prompts to start one')
    async voiceCommandWithoutSessionPromptsToStartOne() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        state.sessionId = '';

        component.input = '/voice';
        await component.submit();

        expect(component.notice).toContain('No session selected. Start a session before using /voice.');
        expect(appRpc.calls.some(call => call.method.startsWith('audio.'))).toEqual(false);
    }

    @Test('voice command degrades gracefully without gateway rpc')
    async voiceCommandDegradesWithoutGatewayRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const { state, component } = createConsoleParts(runtime, scheduler);
        state.sessionId = 'voice-7';
        await component.onInit();

        component.input = '/voice';
        await component.submit();

        expect(component.notice).toContain('voice unavailable');
        expect(component.notice).toContain('Usage: /voice start|stop|cancel|status');
    }
}

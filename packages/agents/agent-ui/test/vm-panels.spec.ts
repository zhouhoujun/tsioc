import { navigationFor } from './test-transcript-navigation';
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

@Suite('Agent console panels/focus/navigation')
export class VmPanelsTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('input panel submits on enter variants and keeps ctrl-enter for newline')
    async inputPanelSubmitsOnEnterVariantsAndKeepsCtrlEnterForNewline() {
        let submitCount = 0;
        const panel = new AgentConsoleInputPanelComponent();
        panel.submitAction = async () => {
            submitCount++;
        };

        await panel.onKeydown({ key: 'Escape' } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', ctrlKey: true, preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', altKey: true, preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'enter', preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: '', code: 'NumpadEnter', preventDefault() {} } as KeyboardEvent);

        expect(submitCount).toEqual(3);
    }

    @Test('input panel routes suggestion keys through shared session state')
    async inputPanelRoutesSuggestionKeysThroughSharedState() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setCommandHints(['/help', '/hello']);
        state.setInput('/');
        const panel = new AgentConsoleInputPanelComponent(state);

        await panel.onKeydown({ key: 'ArrowDown', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu?.selectedIndex).toEqual(1);

        const secondValue = state.selectMenu?.options[1]?.value ?? '/status';
        await panel.onKeydown({ key: 'Tab', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual(`${secondValue} `);
        expect(state.selectMenu).toEqual(undefined);

        state.submitAction = async () => {
            state.setNotice('submitted');
        };
        state.setInput('/he');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('/help ');
        expect(state.notice).toEqual('submitted');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('check @wo');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('check @workspace ');
        expect(state.notice).toEqual('submitted');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('/');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Escape', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('input panel confirms normal select menus with enter')
    async inputPanelConfirmsNormalSelectMenusWithEnter() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const resolved: Array<string | undefined> = [];
        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        state.selectMenuAction = value => {
            resolved.push(value);
        };
        const panel = new AgentConsoleInputPanelComponent(state);

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);

        expect(resolved).toEqual(['/tools']);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('terminal input submits combined text and return chunks')
    async terminalInputSubmitsCombinedTextAndReturnChunks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        await (component as any).handleTerminalInput(
            { text: '/sessions\r', partial: false },
            '/sessions\r'
        );

        expect(component.input).toEqual('');
        expect(component.showSessionsPanel).toEqual(true);
    }

    @Test('terminal input navigates input history with arrow keys')
    async terminalInputNavigatesInputHistoryWithArrowKeys() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.inputHistoryController.push('first');
        component.sessionState.inputHistoryController.push('/sessions');
        component.sessionState.inputHistoryController.push('second');

        await (component as any).handleTerminalInput(
            { text: '\u001b[A', controlKey: 'up', partial: false },
            '\u001b[A'
        );
        expect(component.input).toEqual('second');

        await (component as any).handleTerminalInput(
            { text: '\u001b[A', controlKey: 'up', partial: false },
            '\u001b[A'
        );
        expect(component.input).toEqual('first');
    }

    @Test('timeline boundary uses readable step label and preserves active content')
    timelineBoundaryUsesReadableStepLabel() {
        const state = new AgentConsoleSessionState();
        state.setPlanTodos([{ id: 's1', content: 'write tests', status: 'in_progress' } as any]);
        state.setTimelineMode('steps');
        const boundary = state.displayMessages.find(message => message.metadata?.uiKind === 'timeline-boundary');
        expect(boundary?.content).toContain('第 1/1 步');
        expect(boundary?.content).toContain('write tests');
        expect(boundary?.content).not.toContain('-- step');
    }

    @Test('terminal input moves cursor with left and right arrows without inserting escape text')
    async terminalInputMovesCursorWithoutInsertingEscapeText() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.inputHistoryController.push('first');
        component.sessionState.inputHistoryController.push('second');

        await (component as any).handleTerminalInput(
            { text: '\u001b[A', controlKey: 'up', partial: false },
            '\u001b[A'
        );
        expect(component.input).toEqual('second');
        expect(component.inputCursor).toEqual('second'.length);

        await (component as any).handleTerminalInput(
            { text: '\u001b[D', controlKey: 'left', partial: false },
            '\u001b[D'
        );
        expect(component.input).toEqual('second');
        expect(component.inputCursor).toEqual('second'.length - 1);

        await (component as any).handleTerminalInput(
            { text: '\u001b[C', controlKey: 'right', partial: false },
            '\u001b[C'
        );
        expect(component.input).toEqual('second');
        expect(component.inputCursor).toEqual('second'.length);
    }

    @Test('terminal input routes mouse events to the terminal surface accessor')
    async terminalInputRoutesMouseEventsToSurfaceAccessor() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        const mouse = { button: 0, x: 4, y: 12, release: true };
        const handled: any[] = [];

        (component as any).surfaceAccessor = {
            dispatchMouse(event: any) {
                handled.push(event);
                return true;
            }
        };

        await component.onInit();
        component.input = 'draft';
        await (component as any).handleTerminalInput(
            { text: '\u001b[<0;4;12m', mouse, partial: false },
            '\u001b[<0;4;12m'
        );

        expect(handled).toEqual([mouse]);
        expect(component.input).toEqual('draft');
    }

    @Test('copy action writes terminal clipboard sequence through the surface accessor')
    async copyActionWritesTerminalClipboardSequenceThroughSurfaceAccessor() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        const written: string[] = [];

        (component as any).surfaceAccessor = {
            dispatchMouse() {
                return false;
            },
            writeTerminalClipboardText(text: string) {
                written.push(text);
                return true;
            }
        };

        await component.onInit();
        const handler = (component as any).copyFocusedTextActionHandler;
        await handler('hello world', 'selected message');

        expect(written).toEqual(['hello world']);
        expect(component.notice).toEqual('Copied selected message.');
    }

    @Test('input panel closes normal select menus with q and escape')
    async inputPanelClosesNormalSelectMenusWithQAndEscape() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const panel = new AgentConsoleInputPanelComponent(state);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'q', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'Escape', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('select panel closes menus with q and esc aliases')
    async selectPanelClosesMenusWithDismissKeys() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const panel = new AgentConsoleSelectPanelComponent(state);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'Q', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'Esc', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('handleFocusKey treats q like escape for focused panels')
    async handleFocusKeyTreatsQAsDismissAcrossFocusedPanels() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setSessions([
            { id: 'default', current: true, messageCount: 1, updatedAt: 1 } as any
        ]);
        state.setSessionsFocused(true);

        expect(await state.handleFocusKey('Q', navigationFor(state))).toEqual(true);
        expect(state.sessionsFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);

        state.setMessages([
            { id: 'm1', role: 'assistant', content: 'hello', createdAt: 1 } as any
        ]);
        navigationFor(state).setFocused(true);
        state.openMessageDetail();

        expect(await state.handleFocusKey('Esc', navigationFor(state))).toEqual(true);
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messagesFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);
    }

    @Test('focused tool panel activates selected tool on enter')
    async focusedToolPanelActivatesSelectedToolOnEnter() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const activated: string[] = [];
        state.setTools([
            { name: 'read_file', toolset: 'filesystem', active: false, activationKind: 'deferred' }
        ]);
        state.activateSelectedToolAction = async toolName => {
            activated.push(toolName);
        };
        state.setToolsFocused(true);

        const result = await state.processDecodedInput(
            { text: '\r', controlKey: 'return', partial: false },
            '\r',
            {
                isClosed: false,
                onExit() {},
                hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state),
            }
        );

        expect(result.handled).toEqual(true);
        expect(activated).toEqual(['read_file']);
    }

    @Test('session state supports focused session list navigation')
    sessionStateSupportsFocusedSessionListNavigation() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setSessions([
            { id: 'chat-1', current: true, messageCount: 4, updatedAt: 4 },
            { id: 'chat-2', current: false, messageCount: 2, updatedAt: 2 }
        ]);

        expect(state.selectedSessionId).toEqual('chat-1');

        state.setSessionsFocused(true);
        expect(state.sessionsFocused).toEqual(true);
        expect(state.selectedSession?.id).toEqual('chat-1');

        state.moveSessionSelection(1);
        expect(state.selectedSession?.id).toEqual('chat-2');

        state.setSelectedSessionId('chat-1');
        expect(state.selectedSession?.id).toEqual('chat-1');

        state.setSessionsFocused(false);
        expect(state.sessionsFocused).toEqual(false);
    }

    @Test('session state supports focused tool list navigation')
    sessionStateSupportsFocusedToolListNavigation() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setTools([
            { name: 'read_file', toolset: 'filesystem', active: true, activationKind: 'always' },
            { name: 'write_file', toolset: 'filesystem', active: false, activationKind: 'approval' }
        ]);

        expect(state.selectedTool?.name).toEqual('read_file');

        state.setToolsFocused(true);
        expect(state.toolsFocused).toEqual(true);

        state.moveToolSelection(1);
        expect(state.selectedTool?.name).toEqual('write_file');

        state.setSelectedToolName('read_file');
        expect(state.selectedTool?.name).toEqual('read_file');

        state.setToolsFocused(false);
        expect(state.toolsFocused).toEqual(false);
    }

    @Test('session state supports paged session navigation and edges')
    sessionStateSupportsPagedSessionNavigationAndEdges() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setSessions([
            { id: 'chat-1', current: true } as any,
            { id: 'chat-2', current: false } as any,
            { id: 'chat-3', current: false } as any,
            { id: 'chat-4', current: false } as any,
            { id: 'chat-5', current: false } as any,
            { id: 'chat-6', current: false } as any,
            { id: 'chat-7', current: false } as any
        ]);

        state.moveSessionSelectionPage(1);
        expect(state.selectedSession?.id).toEqual('chat-6');

        state.selectLastSession();
        expect(state.selectedSession?.id).toEqual('chat-7');

        state.moveSessionSelectionPage(-1);
        expect(state.selectedSession?.id).toEqual('chat-2');

        state.selectFirstSession();
        expect(state.selectedSession?.id).toEqual('chat-1');
    }

    @Test('session state supports focused message list navigation')
    sessionStateSupportsFocusedMessageListNavigation() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);

        expect(state.selectedMessageId).toEqual('m2');

        navigationFor(state).setFocused(true);
        expect(state.messagesFocused).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m2');

        navigationFor(state).move(-1);
        expect(state.selectedMessage?.id).toEqual('m1');

        state.setSelectedMessageId('m2');
        expect(state.selectedMessage?.id).toEqual('m2');

        navigationFor(state).setFocused(false);
        expect(state.messagesFocused).toEqual(false);
    }

    @Test('session state follows the latest message when not browsing messages')
    sessionStateFollowsLatestMessageWhenNotBrowsing() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);

        state.setSelectedMessageId('m1');
        expect(state.selectedMessageId).toEqual('m1');

        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: 'next', createdAt: 3 } as any
        ]);
        expect(state.selectedMessageId).toEqual('m3');

        navigationFor(state).setFocused(true);
        state.setSelectedMessageId('m1');
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: 'next', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: 'reply', createdAt: 4 } as any
        ]);
        expect(state.selectedMessageId).toEqual('m1');
    }

    @Test('session state hides tool messages and blank assistant placeholders from visible navigation')
    sessionStateHidesToolMessagesFromVisibleNavigation() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'u1', role: 'user', content: '查天气', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: '', createdAt: 2, metadata: { toolCalls: [{ id: 'tc1', name: 'weather' }] } } as any,
            { id: 'a-mid', role: 'assistant', content: '你当前所在位置约为成都。今天整体是阴天。', createdAt: 2, metadata: { toolCalls: [{ id: 'tc2', name: 'weather' }] } } as any,
            { id: 'a-stream', role: 'assistant', content: '', createdAt: 2, metadata: { streaming: true } } as any,
            { id: 't1', role: 'tool', content: '{"location":"成都"}', createdAt: 3 } as any,
            { id: 'a2', role: 'assistant', content: '成都当前天气：晴', createdAt: 4 } as any
        ]);

        expect(state.displayMessages.map(message => message.id)).toEqual(['u1', 'a2']);
        expect(state.selectedMessage?.id).toEqual('a2');

        navigationFor(state).setFocused(true);
        navigationFor(state).move(-1);
        expect(state.selectedMessage?.id).toEqual('u1');

        state.setTimelineMode('steps');
        expect(state.displayMessages.map(message => message.id)).toEqual(['u1', 'a-mid', 'a2']);
    }

    @Test('session state hides reasoning messages when showThinking is disabled')
    sessionStateHidesReasoningMessagesWhenThinkingHidden() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.upsertUiEventMessage(state.qualifyUiEventKey('reasoning'), 'Reasoning about implementation', {
            eventType: 'reasoning',
            label: 'think',
            status: 'running'
        });
        state.upsertUiEventMessage('turn-start', 'Working', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });

        expect(state.showThinking).toEqual(true);
        expect(state.displayMessages.some(message => message.metadata?.uiEventType === 'reasoning')).toEqual(true);

        state.setShowThinking(false);
        expect(state.displayMessages.some(message => message.metadata?.uiEventType === 'reasoning')).toEqual(false);
        expect(state.displayMessages).toEqual([]);
    }

    @Test('default stream hides routine turn lifecycle rows but keeps useful events')
    sessionStateHidesRoutineTurnLifecycleRows() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started', label: 'state', status: 'running'
        });
        state.upsertUiEventMessage('tool-weather', 'weather completed · Hangzhou', {
            eventType: 'tool_completed', label: 'tool', status: 'success'
        });
        state.upsertUiEventMessage('turn-complete', 'Turn completed', {
            eventType: 'turn', label: 'turn', status: 'success'
        });
        state.upsertUiEventMessage('turn-cancel', 'Turn cancelled', {
            eventType: 'turn_cancelled', label: 'state', status: 'failed'
        });

        expect(state.displayMessages.map(message => message.content)).toEqual([
            'weather completed · Hangzhou',
            'Turn cancelled'
        ]);

        state.setTimelineMode('steps');
        expect(state.displayMessages.map(message => message.content)).toEqual([
            'Analyzing request',
            'weather completed · Hangzhou',
            'Turn completed',
            'Turn cancelled'
        ]);
    }

    @Test('session state dedupes identical ui event upserts')
    sessionStateDedupesIdenticalUiEventUpserts() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());

        state.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });
        state.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });
        state.upsertUiEventMessage('turn-start', 'Working', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });

        const storedEvents = state.messages.filter(message => message.metadata?.uiKind === 'event');
        expect(storedEvents.length).toEqual(1);
        expect(storedEvents[0].content).toEqual('Working');
        expect(state.displayMessages).toEqual([]);
    }

    @Test('session state supports message detail open and scroll')
    sessionStateSupportsMessageDetailOpenAndScroll() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8',
                createdAt: 1
            } as any
        ]);

        navigationFor(state).setFocused(true);
        state.openMessageDetail();
        expect(state.messageDetailOpen).toEqual(true);
        expect(state.messageDetailScroll).toEqual(0);

        state.scrollMessageDetail(3);
        expect(state.messageDetailScroll).toEqual(2);

        state.closeMessageDetail();
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messageDetailScroll).toEqual(0);
    }

    @Test('session state opens message detail on enter when messages are focused')
    async sessionStateOpensMessageDetailOnEnterWhenMessagesFocused() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8',
                createdAt: 1
            } as any
        ]);

        navigationFor(state).setFocused(true);
        expect(await state.handleFocusKey('enter', navigationFor(state))).toEqual(true);
        expect(state.messageDetailOpen).toEqual(true);
        expect(await state.handleFocusKey('enter', navigationFor(state))).toEqual(true);
        expect(state.messageDetailOpen).toEqual(false);
    }

    @Test('page up entry focuses the latest long message without a command')
    pageUpEntryFocusesLatestLongMessage() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'long', role: 'assistant', content: Array.from({ length: 12 }, (_value, index) => `line ${index}`).join('\n'), createdAt: 1 },
            { id: 'short', role: 'assistant', content: 'done', createdAt: 2 }
        ]);
        expect(state.focusLatestLongMessage()).toEqual(true);
        expect(state.messagesFocused).toEqual(true);
        expect(state.selectedMessageId).toEqual('long');
        expect(state.inputFocused).toEqual(false);
    }

    @Test('session state supports paged message navigation and detail edges')
    sessionStateSupportsPagedMessageNavigationAndDetailEdges() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any,
            { id: 'm5', role: 'user', content: '5', createdAt: 5 } as any,
            { id: 'm6', role: 'assistant', content: '6', createdAt: 6 } as any,
            { id: 'm7', role: 'user', content: '7', createdAt: 7 } as any,
            { id: 'm8', role: 'assistant', content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8', createdAt: 8 } as any
        ]);

        navigationFor(state).selectFirst();
        expect(state.selectedMessage?.id).toEqual('m1');

        navigationFor(state).movePage(1);
        expect(state.selectedMessage?.id).toEqual('m7');

        navigationFor(state).selectLast();
        expect(state.selectedMessage?.id).toEqual('m8');

        state.openMessageDetail();
        state.scrollMessageDetailToEdge('end');
        expect(state.messageDetailScroll).toEqual(2);

        state.scrollMessageDetailPage(-1);
        expect(state.messageDetailScroll).toEqual(0);
    }

    @Test('session state supports message detail horizontal scrolling with tab expansion')
    sessionStateSupportsMessageDetailHorizontalScrollingWithTabExpansion() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: '\tconst value = 42;\n\t\treturn value;',
                createdAt: 1
            } as any
        ]);

        navigationFor(state).setFocused(true);
        state.openMessageDetail();

        expect(state.messageDetailLines[0]).toEqual('    const value = 42;');
        expect(state.messageDetailLines[1]).toEqual('        return value;');
        expect(state.messageDetailMaxColumn).toEqual('        return value;'.length);

        state.scrollMessageDetailColumns(4);
        expect(state.messageDetailColumnScroll).toEqual(4);

        state.scrollMessageDetailColumnsToEdge('end');
        expect(state.messageDetailColumnScroll).toEqual(state.messageDetailMaxColumn - 1);

        state.closeMessageDetail();
        expect(state.messageDetailColumnScroll).toEqual(0);
    }

    @Test('handleSelectKey navigates and confirms select menu')
    handleSelectKeyNavigatesSelectMenu() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' }
        ]);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        
        // Up wraps to last
        state.focusController.handleSelectKey('up');
        expect(state.selectMenu?.selectedIndex).toEqual(2);
        
        // Down wraps to first
        state.focusController.handleSelectKey('down');
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        
        // Down moves to next
        state.focusController.handleSelectKey('down');
        expect(state.selectMenu?.selectedIndex).toEqual(1);
        
        // Escape cancels
        state.focusController.handleSelectKey('escape');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey treats q like escape for select menus')
    handleSelectKeyTreatsQAsEscapeForSelectMenus() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);

        state.focusController.handleSelectKey('q');

        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey returns to parent menu before closing root menu')
    async handleSelectKeyReturnsToParentMenuBeforeClosingRootMenu() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Parent', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ], 1);
        await state.openSubSelectMenu('Child', [
            { label: 'C', value: 'c' },
            { label: 'D', value: 'd' }
        ], 0);

        expect(state.focusController.handleSelectKey('q')).toBe(true);
        expect(state.selectMenu?.title).toEqual('Parent');
        expect(state.selectMenu?.selectedIndex).toEqual(1);

        expect(state.focusController.handleSelectKey('escape')).toBe(true);
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleMenuInput returns to parent menu before closing root menu')
    async handleMenuInputReturnsToParentMenuBeforeClosingRootMenu() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Parent', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ], 0);
        await state.openSubSelectMenu('Child', [
            { label: 'C', value: 'c' },
            { label: 'D', value: 'd' }
        ], 1);

        expect(state.focusController.handleMenuInput('', 'q')).toBe(true);
        expect(state.selectMenu?.title).toEqual('Parent');

        expect(state.focusController.handleMenuInput('escape', '')).toBe(true);
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey selects by number and returns true on handled keys')
    handleSelectKeyReturnsTrueOnHandledKeys() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);
        
        expect(state.focusController.handleSelectKey('up')).toBe(true);
        expect(state.focusController.handleSelectKey('down')).toBe(true);
        expect(state.focusController.handleSelectKey('return')).toBe(true);
        expect(state.selectMenu).toBeUndefined();  // confirmed

        state.openSelectMenu('Test2', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);
        expect(state.focusController.handleSelectKey('1')).toBe(true);
        expect(state.selectMenu).toBeUndefined();  // chosen index 0
        
        // Unhandled key returns false
        expect(state.focusController.handleSelectKey('x')).toBe(false);
    }

    @Test('handleSelectKey moves to edge and by page (P266)')
    handleSelectKeyMovesToEdgeAndPage() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' },
            { label: 'D', value: 'd' }
        ]);
        state.setSelectMenuIndex(2);

        // Page down clamps to last
        expect(state.focusController.handleSelectKey('pagedown')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(3);
        // Home jumps to first
        expect(state.focusController.handleSelectKey('home')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        // Page up clamps to first
        expect(state.focusController.handleSelectKey('pageup')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        // End jumps to last
        state.setSelectMenuIndex(0);
        expect(state.focusController.handleSelectKey('end')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(3);
        // No menu -> keys unhandled
        state.focusController.handleSelectKey('escape');
        expect(state.focusController.handleSelectKey('home')).toBe(false);
    }

    @Test('handleMenuInput moves to edge and by page (P266)')
    handleMenuInputMovesToEdgeAndPage() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' },
            { label: 'D', value: 'd' }
        ]);
        state.setSelectMenuIndex(1);

        expect(state.focusController.handleMenuInput('end', '')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(3);
        expect(state.focusController.handleMenuInput('home', '')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        expect(state.focusController.handleMenuInput('pagedown', '')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(3);
        expect(state.focusController.handleMenuInput('pageup', '')).toBe(true);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
    }

    @Test('handleFocusKey pendingQuestion navigates edge and page (P266)')
    async handleFocusKeyPendingQuestionNavigatesEdgeAndPage() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.pendingQuestion = {
            questionId: 'q1',
            question: 'pick one',
            options: ['a', 'b', 'c', 'd'],
            severity: 'low',
            updatedAt: 1,
            status: 'pending'
        };
        state.pendingQuestionQueue = [state.pendingQuestion];
        state.pendingQuestionSelectedIndex = 2;

        expect(await state.handleFocusKey('pagedown', navigationFor(state))).toEqual(true);
        expect(state.pendingQuestionSelectedIndex).toEqual(3);
        expect(await state.handleFocusKey('home', navigationFor(state))).toEqual(true);
        expect(state.pendingQuestionSelectedIndex).toEqual(0);
        expect(await state.handleFocusKey('pageup', navigationFor(state))).toEqual(true);
        expect(state.pendingQuestionSelectedIndex).toEqual(0);
        expect(await state.handleFocusKey('end', navigationFor(state))).toEqual(true);
        expect(state.pendingQuestionSelectedIndex).toEqual(3);
        expect(await state.handleFocusKey('up', navigationFor(state))).toEqual(true);
        expect(state.pendingQuestionSelectedIndex).toEqual(2);

        // out-of-range digit returns false (previously hard false)
        expect(await state.handleFocusKey('9', navigationFor(state))).toEqual(false);
    }

    @Test('input panel prompt shows a plan-mode badge when enabled')
    async inputPromptShowsPlanBadge() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.inputPrompt = '>';
        const panel = new AgentConsoleInputPanelComponent(state);
        expect(panel.inputPrompt).toEqual('>');

        state.setPlanMode(true);
        expect(panel.inputPrompt).toEqual('> · plan');

        state.setPlanMode(false);
        expect(panel.inputPrompt).toEqual('>');
    }

    @Test('input panel prompt shows the queued prompt count')
    async inputPromptShowsQueuedBadge() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.inputPrompt = '>';
        const panel = new AgentConsoleInputPanelComponent(state);
        expect(panel.inputPrompt).toEqual('>');

        state.setQueuedPromptCount(2);
        expect(panel.inputPrompt).toEqual('> · 2 queued');

        state.setQueuedPromptCount(0);
        expect(panel.inputPrompt).toEqual('>');
    }

    @Test('input panel nudges explicit planning drafts toward plan mode')
    async inputPanelNudgesPlanningDrafts() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const panel = new AgentConsoleInputPanelComponent(state);

        state.setInput('Please design the architecture before changing any files.');
        expect(state.planNudgeLabel).toContain('/plan');
        expect(panel.metaLabel).toContain('/plan');

        state.setInput('Fix the failing unit test in parser.ts now.');
        expect(state.planNudgeLabel).toEqual('');

        state.setInput('先不要改代码，请给出一个完整的实现方案。');
        expect(state.planNudgeLabel).toContain('/plan');
    }

    @Test('input panel routes browser global keys through shared resolver')
    async inputPanelRoutesBrowserGlobalKeys() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const panel = new AgentConsoleInputPanelComponent(state);
        const calls: Array<{ key: string; ctrlKey?: boolean }> = [];
        state.globalKeyInputAction = async (key, modifiers) => {
            calls.push({ key, ctrlKey: modifiers.ctrlKey });
            return key.toLowerCase() === 'p' && !!modifiers.ctrlKey;
        };
        let prevented = false;
        await panel.onKeydown({ key: 'p', ctrlKey: true, metaKey: false, preventDefault() { prevented = true; } } as KeyboardEvent);
        expect(calls).toEqual([{ key: 'p', ctrlKey: true }]);
        expect(prevented).toEqual(true);
    }

    @Test('browser input panel tab queues the draft while a turn is running')
    async browserPanelTabQueuesDraft() {
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        const panel = new AgentConsoleInputPanelComponent(state);
        state.setStatus('running');
        state.setInput('browser draft');

        let prevented = false;
        await panel.onKeydown({ key: 'Tab', ctrlKey: false, metaKey: false, preventDefault() { prevented = true; } } as KeyboardEvent);
        expect(prevented).toEqual(true);
        expect(state.queuedPromptCount).toEqual(1);
        expect(state.input).toEqual('');
    }

    @Test('terminal input passes insert mode keys through as text')
    async terminalInputPassesInsertModeThrough() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.setVimMode(true);
        component.sessionState.setInput('');

        await (component as any).handleTerminalInput(
            { text: 'h', partial: false },
            'h'
        );
        expect(component.input).toEqual('h');

        await (component as any).handleTerminalInput(
            { text: 'i', partial: false },
            'i'
        );
        expect(component.input).toEqual('hi');
    }
}

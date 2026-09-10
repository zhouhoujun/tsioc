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

@Suite('Agent console session sections (P107)')
export class VmSessionSectionsTest {

    @Test('mergeMessagesPage appends fresh messages and dedupes by id')
    async mergeMessagesPageAppendsAndDedupes() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'a', role: 'user', content: 'A', createdAt: 1 } as any,
            { id: 'b', role: 'assistant', content: 'B', createdAt: 2 } as any
        ]);
        state.mergeMessagesPage({
            messages: [
                { id: 'b', role: 'assistant', content: 'B', createdAt: 2 } as any,
                { id: 'c', role: 'user', content: 'C', createdAt: 3 } as any
            ]
        });
        expect(state.messages.map(item => item.id)).toEqual(['a', 'b', 'c']);
    }

    @Test('mergeMessagesPage prepend places older page before existing tail')
    async mergeMessagesPagePrependsOlderMessages() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'c', role: 'user', content: 'C', createdAt: 3 } as any
        ]);
        state.mergeMessagesPage({
            messages: [
                { id: 'a', role: 'user', content: 'A', createdAt: 1 } as any,
                { id: 'b', role: 'assistant', content: 'B', createdAt: 2 } as any
            ],
            mode: 'prepend'
        });
        expect(state.messages.map(item => item.id)).toEqual(['a', 'b', 'c']);
    }

    @Test('mergeMessagesPage replaces sections and keeps messages unchanged on empty page')
    async mergeMessagesPageReplacesSections() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([{ id: 'a', role: 'user', content: 'A', createdAt: 1 } as any]);
        state.setSections([{ id: 's1', label: 'old', createdAt: 1 }]);
        state.mergeMessagesPage({
            messages: [],
            sections: [{ id: 's2', label: 'new', createdAt: 2 }],
            hasMore: false
        });
        expect(state.sections.map(item => item.id)).toEqual(['s2']);
        expect(state.messages.length).toEqual(1);
    }

    @Test('openSession populates sections from the loaded message page')
    async openSessionPopulatesSectionsFromPage() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [{ id: 'chat-a', current: true, lastActiveAt: 3 }];
        sessionService.messagesBySession.set('chat-a', [
            { id: 'msg-1', role: 'assistant', content: 'in section', createdAt: 1, sectionId: 'sec-1' } as any
        ]);
        sessionService.sectionsBySession.set('chat-a', [
            { id: 'sec-1', label: 'Implementation', createdAt: 1 }
        ]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        await (component as any).openSession('chat-a');
        expect(component.sessionState.sections.map(item => item.id)).toEqual(['sec-1']);
        expect(component.sessionState.messages.map(item => item.id)).toEqual(['msg-1']);
    }

    @Test('sections command creates a section with a label argument')
    async sectionsCommandCreatesSection() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [{ id: 'chat-a', current: true, lastActiveAt: 3 }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        component.configure({ sessionId: 'chat-a' });
        const handled = await (component as any).handleCommand('/sections Next step');
        expect(handled).toEqual(true);
        expect(sessionService.sectionsBySession.get('chat-a')?.map(item => item.label)).toEqual(['Next step']);
        expect(component.sessionState.sections.map(item => item.label)).toEqual(['Next step']);
    }

    @Test('sections command lists sections and supports delete action')
    async sectionsCommandListsAndDeletes() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [{ id: 'chat-a', current: true, lastActiveAt: 3 }];
        sessionService.sectionsBySession.set('chat-a', [
            { id: 'sec-1', label: 'Analysis', createdAt: 1 },
            { id: 'sec-2', label: 'Implementation', createdAt: 2 }
        ]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        component.configure({ sessionId: 'chat-a' });
        await (component as any).refreshCurrentSections();
        expect(component.sessionState.sections.map(item => item.label)).toEqual(['Analysis', 'Implementation']);
        await sessionService.deleteSection('chat-a', 'sec-1');
        const remaining = sessionService.sectionsBySession.get('chat-a')!;
        expect(remaining.map(item => item.id)).toEqual(['sec-2']);
        expect(sessionService.deleteCalls[0]).toEqual({ sessionId: 'chat-a', sectionId: 'sec-1' });
    }

    @Test('sections command move records beforeId and rename records label')
    async sectionsCommandMoveAndRename() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [{ id: 'chat-a', current: true, lastActiveAt: 3 }];
        sessionService.sectionsBySession.set('chat-a', [
            { id: 'sec-1', label: 'Analysis', createdAt: 1 },
            { id: 'sec-2', label: 'Implementation', createdAt: 2 }
        ]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        component.configure({ sessionId: 'chat-a' });
        await sessionService.moveSection('chat-a', 'sec-2', undefined, { beforeId: 'sec-1' });
        expect(sessionService.moveCalls[0]).toEqual({ sessionId: 'chat-a', sectionId: 'sec-2', beforeId: 'sec-1' });
        await sessionService.renameSection('chat-a', 'sec-1', 'Refactor');
        expect(sessionService.renameCalls[0]).toEqual({ sessionId: 'chat-a', sectionId: 'sec-1', label: 'Refactor' });
    }

    @Test('refreshThreads carries representative session sections')
    async refreshThreadsCarriesRepresentativeSections() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.setSessions([
            {
                id: 's-a',
                current: true,
                workspace: '/ws',
                primaryThreadId: 'thread-1',
                updatedAt: 5,
                sections: [{ id: 'sec-1', label: 'Analysis', messageCount: 2 }]
            } as any,
            {
                id: 's-b',
                current: false,
                workspace: '/ws',
                primaryThreadId: 'thread-1',
                updatedAt: 3
            } as any
        ]);
        (component as any).refreshThreads();
        expect(component.sessionState.threads.length).toEqual(1);
        expect(component.sessionState.threads[0].sessionCount).toEqual(2);
        expect(component.sessionState.threads[0].sections?.map(item => item.id)).toEqual(['sec-1']);
    }

    @Test('loadMessages unwraps paginated page results through the rpc path')
    async loadMessagesUnwrapsPagedResults() {
        const appRpc = new AppRpcStub();
        appRpc.pageResults = {
            sessionId: 'chat-a',
            messages: [
                { id: 'msg-1', role: 'assistant', content: 'paged', createdAt: 1, sectionId: 'sec-1' } as any
            ],
            sections: [{ id: 'sec-1', label: 'Implementation', createdAt: 1 }],
            nextCursor: 'cursor-2',
            hasMore: true
        };
        const service = new AgentConsoleSessionService(appRpc as any);

        const messages = await service.loadMessages('chat-a');
        expect(messages.map(item => item.id)).toEqual(['msg-1']);

        const page = await service.loadMessagesPage('chat-a');
        expect(page.messages.map(item => item.id)).toEqual(['msg-1']);
        expect(page.sections?.map(item => item.id)).toEqual(['sec-1']);
        expect(page.nextCursor).toEqual('cursor-2');
        expect(page.hasMore).toEqual(true);

        const beforePage = await service.loadMessagesPage('chat-a', undefined, { cursor: 'cursor-2', before: true, limit: 20 });
        const call = appRpc.calls.find(item => item.method === 'session.messages' && item.params?.cursor);
        expect(call?.params).toEqual({ sessionId: 'chat-a', cursor: 'cursor-2', before: true, limit: 20 });
        expect(beforePage.messages.map(item => item.id)).toEqual(['msg-1']);
    }
}


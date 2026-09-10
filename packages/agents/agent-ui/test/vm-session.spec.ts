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
    createConsoleParts,
    WorkspaceSessionStoreStub
} from './_helpers';

@Suite('Agent console session service/grouping')
export class VmSessionTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('component routes session commands through session service and internal notice copy flow')
    async componentRoutesSessionCommandsThroughSessionService() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true },
            { id: 'chat-b', current: false }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.input = '/session';
        await component.submit();
        expect(component.notice).toEqual('No sessions available.');
        expect(sessionService.ensuredSessionIds).toEqual([]);

        component.input = '/new scratch';
        await component.submit();
        expect(sessionService.ensuredSessionIds).toEqual(['scratch']);
        expect(component.sessionId).toEqual('scratch');

        component.input = '/copy input';
        await component.submit();
        expect(component.notice).toEqual('Nothing to copy for input.');
    }

    @Test('session service sorts sessions by workspace then activity')
    async sessionServiceSortsSessionsByWorkspace() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-b'
        });
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a'
        });
        store.sessions.set('chat-c', {
            sessionId: 'chat-c',
            messages: [],
            createdAt: 3,
            updatedAt: 3,
            workspace: '/tmp/project-a'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const sessions = await service.listSessions('chat-c');

        expect(sessions.map(item => item.id)).toEqual(['chat-c', 'chat-a', 'chat-b']);
        expect(sessions[0].workspace).toEqual('/tmp/project-a');
        expect(sessions[0].current).toEqual(true);
    }

    @Test('session service groups sessions by workspace')
    async sessionServiceGroupsSessionsByWorkspace() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-b'
        });
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a'
        });
        store.sessions.set('chat-c', {
            sessionId: 'chat-c',
            messages: [],
            createdAt: 3,
            updatedAt: 3,
            workspace: '/tmp/project-a'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-c');

        expect(projects.map(project => project.workspace)).toEqual(['/tmp/project-a', '/tmp/project-b']);
        expect(projects[0].sessionCount).toEqual(2);
        expect(projects[0].sessions.map(session => session.id)).toEqual(['chat-c', 'chat-a']);
        expect(projects[0].sessions[0].current).toEqual(true);
    }

    @Test('session service groups Windows workspace variants together')
    async sessionServiceGroupsWindowsWorkspaceVariantsTogether() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: 'C:\\Repo\\Agents\\'
        });
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: 'c:/repo/agents'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-b');

        expect(projects.map(project => project.projectKey)).toEqual(['workspace:c:/repo/agents']);
        expect(projects[0].sessionCount).toEqual(2);
        expect(projects[0].sessions.map(session => session.id)).toEqual(['chat-b', 'chat-a']);
    }

    @Test('session service groups sessions by thread')
    async sessionServiceGroupsSessionsByThread() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-a',
            projectId: 'exam-system',
            primaryThreadId: 'thread-1',
            originThreadId: 'root-0',
            sessionRole: 'branch',
            rootRequest: 'Build an exam system',
            focusSummary: 'Thread work'
        });
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a',
            projectId: 'exam-system',
            primaryThreadId: 'thread-1',
            originThreadId: 'root-0',
            sessionRole: 'review',
            rootRequest: 'Build an exam system',
            focusSummary: 'Thread review'
        });
        store.sessions.set('chat-c', {
            sessionId: 'chat-c',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-c'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const threads = await service.listThreads('chat-b');

        expect(threads.map(thread => thread.threadId)).toEqual(['thread-1', 'session:chat-c']);
        expect(threads[0].projectId).toEqual('exam-system');
        expect(threads[0].title).toEqual('Thread review');
        expect(threads[0].rootRequest).toEqual('Build an exam system');
        expect(threads[0].status).toEqual('completed');
        expect(threads[0].stage).toEqual('review');
        expect(threads[0].originThreadId).toEqual('root-0');
        expect(threads[0].currentSessionId).toEqual('chat-b');
        expect(threads[0].sessionCount).toEqual(2);
        expect(threads[0].sessions.map(session => session.id)).toEqual(['chat-b', 'chat-a']);
        expect(threads[0].sessions[0].current).toEqual(true);
    }

    @Test('session service maps worker thread status onto grouped threads')
    async sessionServiceMapsWorkerThreadStatus() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-w', {
            sessionId: 'chat-w',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-a',
            projectId: 'exam-system',
            primaryThreadId: 'thread-w',
            sessionRole: 'worker',
            threadStatus: 'abandoned',
            focusSummary: 'Worker focus'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const threads = await service.listThreads('chat-w');

        expect(threads.length).toEqual(1);
        expect(threads[0].threadId).toEqual('thread-w');
        expect(threads[0].status).toEqual('abandoned');
        expect(threads[0].stage).toEqual('implementation');
        expect(threads[0].sessions[0].threadStatus).toEqual('abandoned');
    }

    @Test('session service falls back to choice grouping with thread status when no thread index exists')
    async sessionServiceFallsBackToChoiceGroupingWithThreadStatus() {
        class StoreWithoutThreadIndexes extends WorkspaceSessionStoreStub {
            async listThreads(): Promise<any[]> {
                return [];
            }
        }
        const store = new StoreWithoutThreadIndexes();
        store.sessions.set('chat-w', {
            sessionId: 'chat-w',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-a',
            projectId: 'exam-system',
            primaryThreadId: 'thread-w',
            sessionRole: 'worker',
            threadStatus: 'blocked',
            focusSummary: 'Worker focus'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const threads = await service.listThreads('chat-w');

        expect(threads.length).toEqual(1);
        expect(threads[0].threadId).toEqual('thread-w');
        expect(threads[0].status).toEqual('blocked');
        expect(threads[0].stage).toEqual('implementation');
        expect(threads[0].sessions[0].threadStatus).toEqual('blocked');
    }

    @Test('session service cancelTurn falls back to the local runtime when no rpc is configured')
    async sessionServiceCancelTurnFallsBackToLocalRuntime() {
        const runtime = {
            cancelTurn: async () => ({ cancelled: true, compensated: 2, toolCallIds: ['tc-a', 'tc-b'] })
        } as any;
        const service = new AgentConsoleSessionService(undefined, undefined, runtime);

        expect(await service.cancelTurn('chat-1')).toEqual(true);
    }

    @Test('session service cancelTurn reports false for an idle local runtime')
    async sessionServiceCancelTurnIdleLocalRuntime() {
        const runtime = {
            cancelTurn: async () => ({ cancelled: false, compensated: 0, toolCallIds: [] })
        } as any;
        const service = new AgentConsoleSessionService(undefined, undefined, runtime);

        expect(await service.cancelTurn('chat-1')).toEqual(false);
    }

    @Test('session service cancelTurn reports false without a session')
    async sessionServiceCancelTurnWithoutSession() {
        const service = new AgentConsoleSessionService(undefined, undefined, undefined);

        expect(await service.cancelTurn('')).toEqual(false);
    }

    @Test('session service lists git step snapshots through app rpc')
    async sessionServiceListsGitStepSnapshotsThroughAppRpc() {
        const appRpc = new AppRpcStub();
        appRpc.gitStepSnapshots = [
            { id: 'snap-1', messageId: 'msg-1', label: 'first step', createdAt: 1 },
            { id: 'snap-2', messageId: 'msg-2', label: 'second step', createdAt: 2 }
        ];
        const service = new AgentConsoleSessionService(appRpc as any, undefined, undefined);

        const snapshots = await service.listGitStepSnapshots('chat-1');

        expect(snapshots.map(item => item.messageId)).toEqual(['msg-1', 'msg-2']);
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.list' && call.params?.sessionId === 'chat-1')).toEqual(true);
    }

    @Test('session service lists git step snapshots from the local runtime without app rpc')
    async sessionServiceListsGitStepSnapshotsFromLocalRuntime() {
        const runtime = {
            listGitStepSnapshots: (sessionId: string) => sessionId === 'chat-1'
                ? [{ id: 'snap-1', messageId: 'msg-1', label: 'step', createdAt: 1 }]
                : []
        } as any;
        const service = new AgentConsoleSessionService(undefined, undefined, runtime);

        expect(await service.listGitStepSnapshots('chat-1')).toHaveLength(1);
        expect(await service.listGitStepSnapshots('chat-2')).toEqual([]);
    }

    @Test('session service returns no git step snapshots without a session')
    async sessionServiceReturnsNoGitStepSnapshotsWithoutSession() {
        const service = new AgentConsoleSessionService(undefined, undefined, undefined);

        expect(await service.listGitStepSnapshots('')).toEqual([]);
    }

    @Test('session service diffs a git step snapshot through app rpc')
    async sessionServiceDiffsGitStepSnapshotThroughAppRpc() {
        const appRpc = new AppRpcStub();
        appRpc.gitStepSnapshotDiffs.set('msg-1', {
            ref: 'msg-1',
            files: [{ filePath: 'src/a.ts', status: 'modified' }],
            rawPatch: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
        });
        const service = new AgentConsoleSessionService(appRpc as any, undefined, undefined);

        const diff = await service.diffGitStepSnapshot('chat-1', 'msg-1');

        expect(diff?.files?.[0]?.filePath).toEqual('src/a.ts');
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.diff' && call.params?.ref === 'msg-1')).toEqual(true);
    }

    @Test('session service returns null when a git step snapshot diff is missing')
    async sessionServiceReturnsNullWhenGitStepSnapshotDiffMissing() {
        const appRpc = new AppRpcStub();
        const service = new AgentConsoleSessionService(appRpc as any, undefined, undefined);

        expect(await service.diffGitStepSnapshot('chat-1', 'missing-ref')).toBeNull();
    }

    @Test('session service returns null for a git snapshot diff without a ref')
    async sessionServiceReturnsNullForGitSnapshotDiffWithoutRef() {
        const appRpc = new AppRpcStub();
        const service = new AgentConsoleSessionService(appRpc as any, undefined, undefined);

        expect(await service.diffGitStepSnapshot('chat-1', '')).toBeNull();
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.diff')).toEqual(false);
    }

    @Test('session service reverts a git step snapshot through app rpc')
    async sessionServiceRevertsGitStepSnapshotThroughAppRpc() {
        const appRpc = new AppRpcStub();
        const service = new AgentConsoleSessionService(appRpc as any, undefined, undefined);

        const result = await service.revertGitStepSnapshot('chat-1', 'msg-1');

        expect(result.reverted).toEqual(true);
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.revert' && call.params?.messageId === 'msg-1')).toEqual(true);
    }

    @Test('session service unreverts a git step snapshot through app rpc')
    async sessionServiceUnrevertsGitStepSnapshotThroughAppRpc() {
        const appRpc = new AppRpcStub();
        const service = new AgentConsoleSessionService(appRpc as any, undefined, undefined);

        const result = await service.unrevertGitStepSnapshot('chat-1');

        expect(result.reverted).toEqual(true);
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.unrevert' && call.params?.sessionId === 'chat-1')).toEqual(true);
    }

    @Test('session service reverts a git step snapshot through the local runtime without app rpc')
    async sessionServiceRevertsGitStepSnapshotThroughLocalRuntime() {
        const runtime = {
            revertGitStepSnapshot: async (sessionId: string, messageId: string) => ({ reverted: true, messageId }),
            unrevertGitStepSnapshot: async () => ({ reverted: true })
        } as any;
        const service = new AgentConsoleSessionService(undefined, undefined, runtime);

        expect((await service.revertGitStepSnapshot('chat-1', 'msg-1')).reverted).toEqual(true);
        expect((await service.unrevertGitStepSnapshot('chat-1')).reverted).toEqual(true);
    }

    @Test('session service reports a failed revert without a message id')
    async sessionServiceReportsFailedRevertWithoutMessageId() {
        const appRpc = new AppRpcStub();
        const service = new AgentConsoleSessionService(appRpc as any, undefined, undefined);

        const result = await service.revertGitStepSnapshot('chat-1', '');

        expect(result.reverted).toEqual(false);
        expect(appRpc.calls.some(call => call.method === 'session.git_snapshot.revert')).toEqual(false);
    }

    @Test('session service reports a failed unrevert without a session')
    async sessionServiceReportsFailedUnrevertWithoutSession() {
        const service = new AgentConsoleSessionService(undefined, undefined, undefined);

        expect((await service.unrevertGitStepSnapshot('')).reverted).toEqual(false);
    }

    @Test('session service prefers project id grouping when metadata exists')
    async sessionServicePrefersProjectIdGrouping() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a',
            projectId: 'exam-system'
        });
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-b',
            projectId: 'exam-system'
        });
        store.sessions.set('chat-c', {
            sessionId: 'chat-c',
            messages: [],
            createdAt: 3,
            updatedAt: 3,
            workspace: '/tmp/project-c'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-b');

        expect(projects.map(project => project.projectKey)).toEqual(['project:exam-system', 'workspace:/tmp/project-c']);
        expect(projects[0].projectId).toEqual('exam-system');
        expect(projects[0].label).toEqual('exam-system');
        expect(projects[0].sessions.map(session => session.id)).toEqual(['chat-a', 'chat-b']);
        expect(projects[0].sessions[1].current).toEqual(true);
    }

    @Test('session service preserves focus summary labels from indexed project sessions')
    async sessionServicePreservesFocusSummaryLabelsFromIndexedProjects() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '',
            focusSummary: 'Investigate flaky worker startup'
        });
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '',
            focusSummary: 'Investigate flaky worker startup'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-b');

        expect(projects.map(project => project.projectKey)).toEqual(['session:chat-a', 'session:chat-b']);
        expect(projects[0].label).toEqual('Investigate flaky worker startup');
        expect(projects[1].label).toEqual('Investigate flaky worker startup');
    }

    @Test('session fallback groups by primary thread when no project list exists')
    async sessionFallbackGroupsByPrimaryThreadWhenNoProjectListExists() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [];
        sessionService.sessions = [
            {
                id: 'chat-a',
                current: true,
                workspace: '',
                primaryThreadId: 'thread-1',
                lastActiveAt: 10
            },
            {
                id: 'chat-b',
                current: false,
                workspace: '',
                primaryThreadId: 'thread-1',
                lastActiveAt: 20
            }
        ];

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        await (component as any).openSession('chat-a');

        expect(component.sessionState.projectKey).toEqual('thread:thread-1');
        expect(component.sessionState.projectLabel).toEqual('thread-1');
        expect(component.sessionState.projectSessionCount).toEqual(2);
        expect(component.sessionState.projects.map(item => item.key)).toEqual(['thread:thread-1']);
    }

    @Test('session service prefers primary thread grouping over workspace')
    async sessionServicePrefersPrimaryThreadGroupingOverWorkspace() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a',
            primaryThreadId: 'thread-1'
        });
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 1,
            updatedAt: 1,
            workspace: '/tmp/project-b',
            primaryThreadId: 'thread-1'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-b');

        expect(projects.map(project => project.projectKey)).toEqual(['thread:thread-1']);
        expect(projects[0].primaryThreadId).toEqual('thread-1');
        expect(projects[0].sessions.map(session => session.id)).toEqual(['chat-a', 'chat-b']);
        expect(projects[0].sessions[1].current).toEqual(true);
    }

    @Test('session service prefers latest active session metadata for grouped labels')
    async sessionServicePrefersLatestActiveSessionMetadataForGroupedLabels() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a',
            projectId: 'exam-system',
            focusSummary: 'Older summary',
            rootRequest: 'Older request'
        });
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 5,
            updatedAt: 5,
            workspace: '/tmp/project-b',
            projectId: 'exam-system',
            focusSummary: 'Latest summary',
            rootRequest: 'Latest request'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-a');

        expect(projects[0].projectKey).toEqual('project:exam-system');
        expect(projects[0].focusSummary).toEqual('Latest summary');
        expect(projects[0].rootRequest).toEqual('Latest request');
    }

    @Test('session service preserves grouped session role metadata from indexed projects')
    async sessionServicePreservesGroupedSessionRoleMetadataFromIndexedProjects() {
        const store = new WorkspaceSessionStoreStub();
        store.sessions.set('chat-a', {
            sessionId: 'chat-a',
            messages: [],
            createdAt: 2,
            updatedAt: 2,
            workspace: '/tmp/project-a',
            primaryThreadId: 'thread-1',
            sessionRole: 'worker'
        });
        store.sessions.set('chat-b', {
            sessionId: 'chat-b',
            messages: [],
            createdAt: 5,
            updatedAt: 5,
            workspace: '/tmp/project-b',
            primaryThreadId: 'thread-1',
            sessionRole: 'review'
        });

        const service = new AgentConsoleSessionService(undefined, store as any, undefined);
        const projects = await service.listProjectSessions('chat-a');

        expect(projects[0].projectKey).toEqual('thread:thread-1');
        expect(projects[0].sessionRole).toEqual('review');
    }

    @Test('project context prefers latest active session metadata in fallback groups')
    async projectContextPrefersLatestActiveSessionMetadataInFallbackGroups() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [];
        sessionService.sessions = [
            {
                id: 'chat-a',
                current: true,
                workspace: '/tmp/project-a',
                primaryThreadId: 'thread-1',
                focusSummary: 'Older summary',
                lastActiveAt: 10
            },
            {
                id: 'chat-b',
                current: false,
                workspace: '/tmp/project-b',
                primaryThreadId: 'thread-1',
                focusSummary: 'Latest summary',
                lastActiveAt: 20
            }
        ];

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        await (component as any).openSession('chat-a');

        expect(component.sessionState.projectKey).toEqual('thread:thread-1');
        expect(component.sessionState.projectLabel).toEqual('Latest summary');
    }

    @Test('project list prefers latest active session label in fallback groups')
    async projectListPrefersLatestActiveSessionLabelInFallbackGroups() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [];
        sessionService.sessions = [
            {
                id: 'chat-a',
                current: true,
                workspace: '/tmp/project-a',
                primaryThreadId: 'thread-1',
                focusSummary: 'Older summary',
                lastActiveAt: 10
            },
            {
                id: 'chat-b',
                current: false,
                workspace: '/tmp/project-b',
                primaryThreadId: 'thread-1',
                focusSummary: 'Latest summary',
                lastActiveAt: 20
            }
        ];

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        await (component as any).openSession('chat-a');

        expect(component.sessionState.projects.map(item => item.key)).toEqual(['thread:thread-1']);
        expect(component.sessionState.projects.map(item => item.label)).toEqual(['Latest summary']);
    }

    @Test('openSession prefers latest project summary and aggregates todos across session order')
    async openSessionPrefersLatestProjectSummaryAndAggregatesTodosAcrossSessionOrder() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [{
            projectKey: 'project:exam-system',
            projectId: 'exam-system',
            label: 'exam-system',
            workspace: '/tmp/project-a',
            sessionCount: 2,
            lastActiveAt: 20,
            sessions: [
                { id: 'chat-a', workspace: '/tmp/project-a', summary: 'older summary', messageCount: 2, lastActiveAt: 10 },
                { id: 'chat-b', workspace: '/tmp/project-b', summary: 'latest project summary', messageCount: 3, lastActiveAt: 20 }
            ]
        }];
        const appRpc = new AppRpcStub();
        appRpc.todoPlanBySession.set('chat-a', [{ id: 'todo-a', content: 'older active item', status: 'pending' }]);
        appRpc.todoPlanBySession.set('chat-b', [{ id: 'todo-b', content: 'newer active item', status: 'in_progress' }]);

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);
        await (component as any).openSession('chat-a');

        expect(component.sessionState.projectSummary).toEqual('latest project summary');
        expect(component.sessionState.planTodos.map(item => item.id)).toEqual(['todo-b', 'todo-a']);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('chat-b');
    }

    @Test('openSession prefers active todo source session over newer completed-only sessions')
    async openSessionPrefersActiveTodoSourceSessionOverNewerCompletedOnlySessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [{
            projectKey: 'project:exam-system',
            projectId: 'exam-system',
            label: 'exam-system',
            workspace: '/tmp/project-a',
            sessionCount: 2,
            lastActiveAt: 20,
            sessions: [
                { id: 'chat-b', workspace: '/tmp/project-b', summary: 'latest project summary', messageCount: 3, lastActiveAt: 20 },
                { id: 'chat-a', workspace: '/tmp/project-a', summary: 'older summary', messageCount: 2, lastActiveAt: 10 }
            ]
        }];
        const appRpc = new AppRpcStub();
        appRpc.todoPlanBySession.set('chat-b', [{ id: 'todo-b', content: 'finished item', status: 'completed' }]);
        appRpc.todoPlanBySession.set('chat-a', [{ id: 'todo-a', content: 'active item', status: 'in_progress' }]);

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);
        await (component as any).openSession('chat-a');

        expect(component.sessionState.planTodos.map(item => item.id)).toEqual(['todo-a']);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('chat-a');
    }

    @Test('refreshTodoPlan ignores failed project sessions and clears stale todos')
    async refreshTodoPlanIgnoresFailedProjectSessionsAndClearsStaleTodos() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.todoFailuresBySession.add('chat-b');
        appRpc.todoPlanBySession.set('chat-a', [{ id: 'todo-a', content: 'active item', status: 'in_progress' }]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        component.sessionState.configure({ sessionId: 'chat-a' });
        component.sessionState.setSessions([
            { id: 'chat-a', current: true, updatedAt: 10, projectKey: 'project:exam-system' } as any,
            { id: 'chat-b', current: false, updatedAt: 20, projectKey: 'project:exam-system' } as any
        ]);
        component.sessionState.setPlanTodos([{ id: 'stale', content: 'stale todo', status: 'pending' } as any], 'chat-a');

        await (component as any).refreshTodoPlan();

        expect(component.sessionState.planTodos.map(item => item.id)).toEqual(['todo-a']);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('chat-a');

        appRpc.todoFailuresBySession.add('chat-a');
        await (component as any).refreshTodoPlan();

        expect(component.sessionState.planTodos).toEqual([]);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('');
    }

    @Test('refreshTodoPlan restores session todos from the local todo tool when no app rpc exists')
    async refreshTodoPlanRestoresTodosFromLocalToolWithoutAppRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const invoked: Array<{ name: string; sessionId?: string }> = [];
        const toolRegistry = {
            getToolDefinitions(): any[] {
                return [{ name: 'todo', toolset: 'planning', activation: { kind: 'always', activated: true } }];
            },
            async isToolActive(): Promise<boolean> {
                return true;
            },
            async invoke(name: string, _input: any, sessionId?: string): Promise<any> {
                invoked.push({ name, sessionId });
                if (name === 'todo') {
                    return {
                        todos: [
                            { id: 'todo-a', content: 'local restore todo', status: 'completed' },
                            { id: 'todo-b', content: 'local active todo', status: 'in_progress' },
                            { id: '', content: 'dropped invalid todo', status: 'pending' }
                        ]
                    };
                }
                return undefined;
            }
        };
        const component = createConsole(runtime, scheduler, toolRegistry as any);

        component.sessionState.configure({ sessionId: 'chat-local' });
        await (component as any).refreshTodoPlan('chat-local');

        expect(component.sessionState.planTodos.map(item => item.id)).toEqual(['todo-a', 'todo-b']);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('chat-local');
        expect(invoked.some(call => call.name === 'todo' && call.sessionId === 'chat-local')).toEqual(true);

        const emptyComponent = createConsole(runtime, scheduler, {
            getToolDefinitions(): any[] {
                return [];
            },
            async invoke(): Promise<any> {
                return undefined;
            }
        } as any);
        emptyComponent.sessionState.configure({ sessionId: 'chat-empty' });
        await (emptyComponent as any).refreshTodoPlan('chat-empty');
        expect(emptyComponent.sessionState.planTodos).toEqual([]);
    }
}

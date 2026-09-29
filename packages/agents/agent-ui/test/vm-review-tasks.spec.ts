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
import {TestFileAdapter, AudioCaptureStub, AudioPlaybackStub, RuntimeStub, FailingRuntimeStub, SchedulerStub, ToolRegistryStub, EventMulticasterStub, ApplicationContextStub, AppRpcStub, SessionServiceStub, createDeferred, createConsole, createConsoleParts, ApprovalManagerStub, waitForCondition, createReviewTask, createCancelableTask, createRetryableTask} from './_helpers';

@Suite('Agent console review/tasks/approvals/voice/model')
export class VmReviewTasksTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('submit keeps previous task ui events in the transcript')
    async submitKeepsPreviousTaskUiEventsInTranscript() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started',
            label: 'state',
            status: 'running'
        });
        component.sessionState.upsertUiEventMessage('tool:weather', 'weather · Chengdu, Sichuan, CN 41.3°C Mainly clear', {
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success'
        });

        component.input = 'next task';
        await component.submit();

        const storedEvents = component.sessionState.messages.filter(message => message.metadata?.uiKind === 'event');
        expect(storedEvents.map(message => message.content)).toContain('Analyzing request');
        const visibleEvents = component.sessionState.displayMessages.filter(message => message.metadata?.uiKind === 'event');
        expect(visibleEvents.map(message => message.content)).toEqual(['weather · Chengdu, Sichuan, CN 41.3°C Mainly clear']);
    }

    @Test('schedulePrompt adds task and updates tasks count')
    async schedulePromptAddsTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.schedulePrompt('later', 100);
        expect(component.tasksCount).toEqual(1);
        expect(scheduler.tasks[0].prompt).toEqual('later');
        expect(scheduler.tasks[0].sessionId).toEqual('console');
        expect(typeof scheduler.tasks[0].runAt).toEqual('number');
    }

    @Test('configure updates model metadata and tools')
    async configureUpdatesModelMetadataAndTools() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.configure({ sessionId: 'chat-1', provider: 'deepseek', model: 'deepseek-v4-flash', workspace: '/tmp/workspace' });
        await component.onInit();
        expect(component.sessionId).toEqual('chat-1');
        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/workspace');
        expect(component.tools.length).toEqual(1);
        expect(component.tools[0].name).toEqual('read_file');
        expect(component.tools[0].active).toEqual(false);
    }

    @Test('rollback activity is surfaced when a compensation event is emitted')
    async rollbackActivitySurfacedFromCompensationEvent() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-rollback' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentCompensationEvent(
            this,
            'chat-rollback',
            'cancelled',
            2,
            ['tc-a', 'tc-b']
        ));

        expect(component.activities.some(activity =>
            activity.kind === 'rollback' && activity.message.includes('Rolled back 2')
        )).toEqual(true);
    }

    @Test('session state starts submit without waiting for model turn completion')
    async sessionStateStartsSubmitWithoutWaitingForTurnCompletion() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        let releaseSubmit!: () => void;
        let completed = false;
        state.submitAction = async () => {
            state.setStatus('running');
            await new Promise<void>(resolve => {
                releaseSubmit = resolve;
            });
            completed = true;
            state.setStatus('idle');
        };

        state.setInput('hello');
        const result = await state.processRawChunk('\r', { submitOnEnter: true });

        expect(result.submitted).toEqual(true);
        expect(state.status).toEqual('running');
        expect(completed).toEqual(false);
        releaseSubmit();
        await Promise.resolve();
        expect(completed).toEqual(true);
    }

    @Test('approvals command loads pending requests through rpc when no local approval manager')
    async approvalsCommandLoadsThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.approvalRequests = [{
            id: 'approval-rpc-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/approvals';
        await component.submit();

        expect(component.sessionState.approvalsFocused).toEqual(true);
        expect(component.sessionState.selectedApproval?.id).toEqual('approval-rpc-1');
        expect(appRpc.calls.some(call => call.method === 'approval.list' && call.params?.sessionId === 'console')).toEqual(true);
    }

    @Test('approval resolve routes through rpc when no local approval manager')
    async approvalResolveRoutesThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.approvalRequests = [{
            id: 'approval-rpc-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/approve approval-rpc-1';
        await component.submit();

        expect(appRpc.approvedApprovals).toEqual(['approval-rpc-1']);
        expect(appRpc.calls.some(call => call.method === 'approval.approve' && call.params?.requestId === 'approval-rpc-1')).toEqual(true);
        expect(component.notice).toContain('Approved write_file');

        appRpc.approvalRequests = [{
            id: 'approval-rpc-2',
            toolName: 'delete_file',
            sessionId: 'console',
            reason: 'Deleting files requires approval.',
            summary: 'Deleting files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000
        }];
        component.input = '/deny approval-rpc-2';
        await component.submit();
        expect(appRpc.deniedApprovals).toEqual(['approval-rpc-2']);
        expect(appRpc.calls.some(call => call.method === 'approval.reject' && call.params?.requestId === 'approval-rpc-2')).toEqual(true);
    }

    @Test('approval list refresh fetches pending requests through rpc')
    async approvalListRefreshFetchesThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.approvalRequests = [{
            id: 'approval-rpc-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'approval required',
            summary: 'approval required',
            hasInput: true,
            inputSummary: undefined,
            createdAt: Date.now(),
            timeoutMs: 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        await (component as any).refreshPendingApprovals('console');

        expect(component.sessionState.pendingApprovals.map(item => item.id)).toEqual(['approval-rpc-1']);
    }

    @Test('review command lists coding tasks and opens selected review')
    async reviewCommandListsCodingTasksAndOpensSelectedReview() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        const retryTask = {
            ...createRetryableTask(),
            id: 'task-2',
            title: 'Patch handlers retry',
            updatedAt: 3,
            metadata: {
                ...(createRetryableTask().metadata || {}),
                retryOfTaskId: 'task-1',
                retrySourceTaskId: 'task-1',
                retrySequence: 1
            }
        };
        appRpc.codingTasks = [retryTask, reviewTask];
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(appRpc.calls.some(call => call.method === 'coding_task.list')).toEqual(true);
        expect(component.sessionState.selectMenu?.title).toEqual('Coding tasks');
        expect(component.sessionState.selectMenu?.hint).toEqual(component.sessionState.consoleOptions.selectHint);
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('task-1');
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('Patch handlers');
        expect(component.sessionState.selectMenu?.options[0]?.description).toContain('root');
        expect(component.sessionState.selectMenu?.options[0]?.description).toContain('lineage 2');
        expect(component.sessionState.selectMenu?.options[1]?.label).toContain('task-2');
        expect(component.sessionState.selectMenu?.options[1]?.description).toContain('retry 1');
        expect(component.sessionState.selectMenu?.options[1]?.description).toContain('from task-1');
        expect(component.sessionState.selectMenu?.options[1]?.description).toContain('lineage 2');

        await component.sessionState.confirmSelectMenu('task-1');
        await pending;

        const diffCall = appRpc.calls.find(call => call.method === 'coding_task.diff');
        expect(diffCall?.params).toEqual({ sessionId: 'console', taskId: 'task-1' });
        expect(component.sessionState.reviewOpen).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewExecutionMode).toEqual('parallel');
        expect(component.sessionState.reviewWorkers.length).toEqual(1);
    }

    @Test('review diff command gathers a git diff and opens the panel without touching the worktree')
    async reviewDiffCommandOpensGitDiffPanel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.reviewDiffResult = {
            files: ['src/a.ts'],
            diff: 'diff --git a/src/a.ts b/src/a.ts\n+new line',
            stats: '1 file changed, 1 insertion(+)',
            commitSha: 'abc123'
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review diff';
        const pending = component.submit();
        await waitForCondition(() => component.sessionState.reviewOpen);

        expect(appRpc.calls.some(call => call.method === 'tools.activate' && call.params?.name === 'review_diff')).toEqual(true);
        const diffCall = appRpc.calls.find(call => call.method === 'review.diff');
        expect(diffCall?.params).toEqual({ sessionId: 'console', base: 'HEAD' });
        expect(component.sessionState.reviewTask?.id).toEqual('git-diff:HEAD');
        expect(component.sessionState.reviewTask?.metadata?.reviewMode).toEqual('git-diff');
        expect(component.notice).toContain('1 file changed');
        await pending;
    }

    @Test('diff command opens the shared review panel with scope and path filters')
    async worktreeDiffCommandOpensReviewPanel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.reviewDiffResult = {
            scope: 'staged',
            files: ['src/a.ts'],
            diff: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        await (component as any).handleCommand('/diff --staged src/a.ts');

        const diffCall = appRpc.calls.find(call => call.method === 'review.diff');
        expect(diffCall?.params).toEqual({ sessionId: 'console', scope: 'staged', paths: ['src/a.ts'] });
        expect(component.sessionState.reviewOpen).toEqual(true);
        expect(component.sessionState.reviewTask?.metadata?.reviewMode).toEqual('worktree-diff');
        expect(component.sessionState.reviewTask?.metadata?.scope).toEqual('staged');
        expect(component.sessionState.selectedReviewFileSection?.path).toEqual('src/a.ts');
        expect(component.notice).toContain('Staged diff: 1 file changed');
    }

    @Test('diff command rejects conflicting worktree scope flags')
    async worktreeDiffCommandRejectsConflictingFlags() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, new AppRpcStub());
        await component.onInit();

        await (component as any).handleCommand('/diff --staged --unstaged');

        expect(component.notice).toContain('Use only one');
    }

    @Test('review run command runs analysis and saves findings')
    async reviewRunCommandAnalyzesAndSaves() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.reviewDiffResult = {
            files: ['src/a.ts'],
            diff: 'diff --git a/src/a.ts b/src/a.ts\n+new line',
            stats: '1 file changed, 1 insertion(+)',
            commitSha: 'abc123'
        };
        appRpc.runTurnResults = [{
            message: {
                content: '[{"category":"risk","severity":"warning","summary":"unchecked input","anchor":{"file":"src/a.ts","line":3},"suggestion":"validate input"}]'
            }
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review run';
        await component.submit();

        const turnCall = appRpc.calls.find(call => call.method === 'run.turn');
        expect(turnCall?.params?.sessionId).toEqual('console');
        expect(turnCall?.params?.input).toContain('git diff against HEAD');
        expect(turnCall?.params?.input).toContain('src/a.ts');
        const saveCall = appRpc.calls.find(call => call.method === 'review.save');
        expect(saveCall?.params?.sessionId).toEqual('console');
        expect(saveCall?.params?.run?.base).toEqual('HEAD');
        expect(saveCall?.params?.run?.commitSha).toEqual('abc123');
        expect(saveCall?.params?.run?.findings?.length).toEqual(1);
        expect(saveCall?.params?.run?.findings[0].category).toEqual('risk');
        expect(appRpc.reviewSaved.length).toEqual(1);
        expect(component.sessionState.reviewOpen).toEqual(true);
    }

    @Test('review run command reports when analysis produced no parseable findings')
    async reviewRunCommandReportsNoFindings() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.reviewDiffResult = {
            files: ['src/a.ts'],
            diff: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
        };
        appRpc.runTurnResults = [{ message: { content: 'no issues here' } }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review run';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'run.turn')).toEqual(true);
        expect(appRpc.reviewSaved.length).toEqual(0);
        expect(component.sessionState.reviewOpen).toEqual(true);
    }

    @Test('review findings command lists saved runs filtered by commit')
    async reviewFindingsCommandListsRuns() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.reviewRuns = [
            { id: 'r1', base: 'HEAD', files: ['src/a.ts'], findings: [{ id: 'f1' }], commitSha: 'abc123' },
            { id: 'r2', base: 'HEAD~1', files: ['src/b.ts'], findings: [], commitSha: 'def456' }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review findings';
        await component.submit();

        const listCall = appRpc.calls.find(call => call.method === 'review.list');
        expect(listCall?.params).toEqual({ sessionId: 'console' });
        expect(component.notice).toContain('[r2] HEAD~1 · 1 file · 0 findings');

        component.input = '/review findings abc123';
        await component.submit();

        const commitCall = appRpc.calls.filter(call => call.method === 'review.list').find(call => call.params?.commit === 'abc123');
        expect(commitCall?.params).toEqual({ sessionId: 'console', commit: 'abc123' });
        expect(component.notice).toContain('[r1] HEAD · 1 file · 1 finding');
    }

    @Test('review show command displays findings of a saved run')
    async reviewShowCommandDisplaysRunFindings() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.reviewRunDetail = {
            id: 'r1',
            base: 'HEAD',
            files: ['src/a.ts'],
            findings: [{
                id: 'f1',
                category: 'correctness',
                severity: 'error',
                summary: 'null deref',
                anchor: { file: 'src/a.ts', line: 10 },
                suggestion: 'guard with ?.'
            }]
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review show r1';
        await component.submit();

        const getCall = appRpc.calls.find(call => call.method === 'review.get');
        expect(getCall?.params).toEqual({ sessionId: 'console', id: 'r1' });
        expect(component.notice).toContain('fix: guard with ?.');

        component.input = '/review show';
        await component.submit();
        expect(component.notice).toContain('Usage: /review show <id>');
    }

    @Test('approval request selector uses action hint')
    async approvalRequestSelectorUsesActionHint() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const approvals = new ApprovalManagerStub();
        approvals.pending = [{
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000,
            expiresAt: Date.now() + 30000
        }, {
            id: 'approval-2',
            toolName: 'edit_file',
            sessionId: 'console',
            reason: 'Editing files requires approval.',
            summary: 'Editing files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"src/app.ts"}',
            createdAt: Date.now(),
            timeoutMs: 30000,
            expiresAt: Date.now() + 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, approvals);
        await component.onInit();

        const pending = (component as any).openApprovalInspector(approvals.pending.slice());
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toEqual('Pending approvals');
        expect(component.sessionState.selectMenu?.hint).toEqual(component.sessionState.consoleOptions.selectHint);

        await component.sessionState.cancelSelectMenu();
        await pending;
    }

    @Test('approval action selector uses action hint')
    async approvalActionSelectorUsesActionHint() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const approvals = new ApprovalManagerStub();
        approvals.pending = [{
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000,
            expiresAt: Date.now() + 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, approvals);
        await component.onInit();

        const pending = (component as any).openApprovalInspector(approvals.pending.slice());
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toContain('Approval approval');
        expect(component.sessionState.selectMenu?.hint).toEqual(component.sessionState.consoleOptions.selectHint);

        await component.sessionState.cancelSelectMenu();
        await pending;
    }

    @Test('tasks command opens inspector with rollback metadata')
    async tasksCommandOpensInspectorWithRollbackMetadata() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'coding_task.list')).toEqual(true);
        expect(component.sessionState.tasksFocused).toEqual(true);
        expect(component.sessionState.selectedTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewTaskChoices[0]?.checkpointSummary).toContain('1 total');
        expect(component.sessionState.reviewTaskChoices[0]?.workerCount).toEqual(1);
    }

    @Test('tasks focus filters failed and rollback tasks')
    async tasksFocusFiltersFailedAndRollbackTasks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const rollbackTask = {
            ...createReviewTask(),
            lineageRootTaskId: 'task-1',
            lineageTaskCount: 2
        };
        const failedTask = {
            ...createReviewTask(),
            id: 'task-2',
            title: 'Fix validation',
            status: 'failed',
            retryOfTaskId: 'task-1',
            lineageRootTaskId: 'task-1',
            retryDepth: 1,
            lineageTaskCount: 2,
            result: {
                executionMode: 'sequential',
                workers: [],
                rollback: {
                    available: false
                }
            },
            metadata: {
                checkpoints: []
            }
        };
        const runningTask = {
            ...createCancelableTask(),
            id: 'task-3',
            title: 'Refactor api',
            metadata: {
                checkpoints: []
            }
        };
        appRpc.codingTasks = [rollbackTask, failedTask, runningTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();

        expect(component.sessionState.filteredReviewTaskChoices.map(item => item.id)).toEqual(['task-1', 'task-2', 'task-3']);

        await component.sessionState.handleFocusKey('l', navigationFor(component.sessionState));
        expect(component.sessionState.selectedTaskFilter).toEqual('lineage');
        expect(component.sessionState.selectedTaskLineageRootId).toEqual('task-1');
        expect(component.sessionState.filteredReviewTaskChoices.map(item => item.id)).toEqual(['task-1', 'task-2']);
        expect(component.sessionState.selectedTask?.id).toEqual('task-1');

        await component.sessionState.handleFocusKey('f', navigationFor(component.sessionState));
        expect(component.sessionState.selectedTaskFilter).toEqual('failed');
        expect(component.sessionState.filteredReviewTaskChoices.map(item => item.id)).toEqual(['task-2']);
        expect(component.sessionState.selectedTask?.id).toEqual('task-2');

        await component.sessionState.handleFocusKey('v', navigationFor(component.sessionState));
        expect(component.sessionState.selectedTaskFilter).toEqual('rollback');
        expect(component.sessionState.filteredReviewTaskChoices.map(item => item.id)).toEqual(['task-1']);
        expect(component.sessionState.selectedTask?.id).toEqual('task-1');

        await component.sessionState.handleFocusKey('u', navigationFor(component.sessionState));
        expect(component.sessionState.selectedTaskFilter).toEqual('all');
        expect(component.sessionState.filteredReviewTaskChoices.map(item => item.id)).toEqual(['task-1', 'task-2', 'task-3']);
        expect(component.sessionState.selectedTask?.id).toEqual('task-1');
    }

    @Test('tasks focus cancel action cancels selected coding task')
    async tasksFocusCancelActionCancelsSelectedCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createCancelableTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        await component.sessionState.handleFocusKey('x', navigationFor(component.sessionState));

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Cancelled task-1.');
    }

    @Test('tasks focus retry action retries failed workers for selected coding task')
    async tasksFocusRetryActionRetriesFailedWorkersForSelectedCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createRetryableTask();
        appRpc.codingTasks = [reviewTask];
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        await component.sessionState.handleFocusKey('r', navigationFor(component.sessionState));

        expect(appRpc.calls.some(call => call.method === 'coding_task.retry_failed' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1-retry');
        expect(component.notice).toEqual('Retried failed workers from task-1 as task-1-retry.');
    }

    @Test('tasks focus escape cancels selected running coding task')
    async tasksFocusEscapeCancelsSelectedRunningCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createCancelableTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        await component.sessionState.handleFocusKey('escape', navigationFor(component.sessionState));

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Cancelled task-1.');
    }

    @Test('tasks focus does not cancel completed coding task')
    async tasksFocusDoesNotCancelCompletedCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTasks = [reviewTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        await component.sessionState.handleFocusKey('x', navigationFor(component.sessionState));

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel')).toEqual(false);
        expect(component.notice).toEqual('Cancel is unavailable for task-1.');
    }

    @Test('review focus escape cancels running coding task')
    async reviewFocusEscapeCancelsRunningCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createCancelableTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            summary: '1 worker diff(s) captured',
            text: 'diff --git a/src/a.ts b/src/a.ts\n+new line',
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review task-1';
        await component.submit();
        await component.sessionState.handleFocusKey('Esc', navigationFor(component.sessionState));

        expect(appRpc.calls.some(call => call.method === 'coding_task.cancel' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Cancelled task-1.');
    }

    @Test('cancel coding task ignores stale results after switching sessions')
    async cancelCodingTaskIgnoresStaleResultsAfterSwitchingSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const appRpc = new AppRpcStub();
        const deferred = createDeferred<any>();
        const task = createCancelableTask();
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 2 },
            { id: 'chat-b', current: false, lastActiveAt: 1 }
        ];
        appRpc.state = {
            sessionId: 'chat-a',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            workspace: '/tmp/workspace',
            title: 'Console'
        };
        appRpc.codingTasksBySession.set('chat-a', [task]);
        appRpc.codingTasksBySession.set('chat-b', [{ ...createReviewTask(), id: 'task-b', title: 'Task B' }]);
        appRpc.codingTaskCancelHandlers.set('task-1', () => deferred.promise);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);

        await component.onInit();
        const pending = (component as any).cancelCodingTask('task-1');
        await Promise.resolve();

        await (component as any).openSession('chat-b');
        deferred.resolve({
            sessionId: 'chat-a',
            taskId: 'task-1',
            cancelled: true,
            task: {
                ...task,
                status: 'cancelled'
            }
        });
        await pending;

        expect(component.sessionId).toEqual('chat-b');
        expect(component.sessionState.tasksFocused).toEqual(false);
        expect(component.notice).toEqual('');
    }

    @Test('review focus retry action retries failed workers for active coding task')
    async reviewFocusRetryActionRetriesFailedWorkersForActiveCodingTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createRetryableTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: reviewTask.result.diff,
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review task-1';
        await component.submit();
        await component.sessionState.handleFocusKey('r', navigationFor(component.sessionState));

        expect(appRpc.calls.some(call => call.method === 'coding_task.retry_failed' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1-retry');
        expect(component.notice).toEqual('Retried failed workers from task-1 as task-1-retry.');
    }

    @Test('retry command ignores stale results after opening another review')
    async retryCommandIgnoresStaleResultsAfterOpeningAnotherReview() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const deferred = createDeferred<any>();
        const reviewTask = createRetryableTask();
        const reviewTaskB = {
            ...createReviewTask(),
            id: 'task-b',
            title: 'Task B'
        };
        const retriedTask = {
            ...reviewTask,
            id: 'task-1-retry',
            title: `Retry failed workers: ${reviewTask.title}`,
            status: 'completed'
        };
        appRpc.codingTaskRetryHandlers.set('task-1', () => deferred.promise);
        appRpc.codingTaskDetails.set('task-b', reviewTaskB);
        appRpc.codingTaskDiffs.set('task-b', {
            sessionId: 'console',
            taskId: 'task-b',
            executionMode: 'parallel',
            diff: {
                summary: 'task b diff',
                text: 'diff --git a/src/b.ts b/src/b.ts\n+task b'
            },
            workers: reviewTaskB.result.workers
        });
        appRpc.codingTaskDetails.set('task-1-retry', retriedTask);
        appRpc.codingTaskDiffs.set('task-1-retry', {
            sessionId: 'console',
            taskId: 'task-1-retry',
            executionMode: 'parallel',
            diff: {
                summary: 'stale retry diff',
                text: 'diff --git a/src/retry.ts b/src/retry.ts\n+stale retry'
            },
            workers: retriedTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        await component.onInit();
        const pending = (component as any).retryFailedCodingTask('task-1');
        await Promise.resolve();

        await (component as any).openCodingTaskReview('task-b');
        deferred.resolve({
            sessionId: 'console',
            taskId: 'task-1',
            retried: true,
            task: retriedTask
        });
        await pending;

        expect(component.sessionState.reviewTask?.id).toEqual('task-b');
        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('task b diff');
        expect(component.notice).toEqual('');
        expect(appRpc.calls.some(call => call.method === 'coding_task.diff' && call.params?.taskId === 'task-1-retry')).toEqual(false);
    }

    @Test('review focus lineage navigation jumps between parent and child tasks')
    async reviewFocusLineageNavigationJumpsBetweenParentAndChildTasks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const rootTask = {
            ...createReviewTask(),
            id: 'task-0',
            title: 'Initial patch'
        };
        const retryTask = {
            ...createRetryableTask(),
            id: 'task-1',
            title: 'Retry patch',
            metadata: {
                ...(createRetryableTask().metadata || {}),
                retryOfTaskId: 'task-0',
                retrySourceTaskId: 'task-0',
                retrySequence: 1
            }
        };
        appRpc.codingTasks = [rootTask, retryTask];
        appRpc.codingTaskDetails.set('task-0', rootTask);
        appRpc.codingTaskDetails.set('task-1', retryTask);
        appRpc.codingTaskDiffs.set('task-0', {
            sessionId: 'console',
            taskId: 'task-0',
            executionMode: 'parallel',
            diff: rootTask.result.diff,
            workers: rootTask.result.workers
        });
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: retryTask.result.diff,
            workers: retryTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        component.input = '/review task-1';
        await component.submit();

        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('Review: needs attention · lineage 2/2');

        await component.sessionState.handleFocusKey('p', navigationFor(component.sessionState));
        expect(component.sessionState.reviewTask?.id).toEqual('task-0');
        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('Review: ready · rollback available · lineage 1/2');

        await component.sessionState.handleFocusKey('n', navigationFor(component.sessionState));
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('Review: needs attention · lineage 2/2');
    }

    @Test('review command loads direct task id without opening select menu')
    async reviewCommandLoadsDirectTaskIdWithoutSelectMenu() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review task-1';
        await component.submit();

        expect(component.sessionState.selectMenu).toEqual(undefined);
        expect(appRpc.calls.some(call => call.method === 'coding_task.get' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(appRpc.calls.some(call => call.method === 'coding_task.diff' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewExecutionMode).toEqual('parallel');
        expect(component.sessionState.reviewWorkers.length).toEqual(1);
        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('diff --git a/src/a.ts b/src/a.ts');
        expect(component.notice).toEqual('');
    }

    @Test('openCodingTaskReview ignores stale results from earlier review loads')
    async openCodingTaskReviewIgnoresStaleResultsFromEarlierReviewLoads() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const delayedDiff = createDeferred<any>();
        appRpc.codingTaskDiffHandlers.set('task-a', () => delayedDiff.promise);
        appRpc.codingTaskDiffs.set('task-b', {
            sessionId: 'chat-b',
            taskId: 'task-b',
            executionMode: 'parallel',
            diff: {
                summary: 'task b diff',
                text: 'diff --git a/src/b.ts b/src/b.ts\n+task b'
            },
            workers: []
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        component.sessionState.setTaskRecords([
            { id: 'task-a', title: 'Task A', sourceSessionId: 'chat-a', status: 'running' } as any,
            { id: 'task-b', title: 'Task B', sourceSessionId: 'chat-b', status: 'completed' } as any
        ]);

        const firstOpen = (component as any).openCodingTaskReview('task-a');
        await Promise.resolve();

        await (component as any).openCodingTaskReview('task-b');
        expect(component.sessionState.reviewTask?.id).toEqual('task-b');
        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('task b diff');

        delayedDiff.resolve({
            sessionId: 'chat-a',
            taskId: 'task-a',
            executionMode: 'parallel',
            diff: {
                summary: 'task a diff',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+task a'
            },
            workers: []
        });
        await firstOpen;

        expect(component.sessionState.reviewTask?.id).toEqual('task-b');
        expect(component.sessionState.reviewDetailLines.join('\n')).toContain('task b diff');
        expect(component.sessionState.reviewDetailLines.join('\n')).not.toContain('task a diff');
    }

    @Test('review command preselects the active review task in selector')
    async reviewCommandPreselectsTheActiveReviewTaskInSelector() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const rootTask = {
            ...createReviewTask(),
            id: 'task-0',
            title: 'Initial patch'
        };
        const retryTask = {
            ...createRetryableTask(),
            id: 'task-1',
            title: 'Retry patch',
            metadata: {
                ...(createRetryableTask().metadata || {}),
                retryOfTaskId: 'task-0',
                retrySourceTaskId: 'task-0',
                retrySequence: 1
            }
        };
        appRpc.codingTasks = [rootTask, retryTask];
        appRpc.codingTaskDetails.set('task-1', retryTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: retryTask.result.diff,
            workers: retryTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/review task-1';
        await component.submit();

        component.input = '/review';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toEqual('Coding tasks');
        expect(component.sessionState.selectMenu?.hint).toEqual(component.sessionState.consoleOptions.selectHint);
        expect(component.sessionState.selectMenu?.selectedIndex).toEqual(1);
        expect(component.sessionState.selectMenu?.options[1]?.label).toContain('task-1');

        await component.sessionState.cancelSelectMenu();
        await pending;
    }

    @Test('retry command retries failed workers for direct task id')
    async retryCommandRetriesFailedWorkersForDirectTaskId() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createRetryableTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/retry task-1';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'coding_task.retry_failed' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1-retry');
        expect(component.notice).toEqual('Retried failed workers from task-1 as task-1-retry.');
    }

    @Test('retry command opens selector when no task is focused')
    async retryCommandOpensSelectorWhenNoTaskIsFocused() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const rootTask = createReviewTask();
        const retryableTask = {
            ...createRetryableTask(),
            id: 'task-2',
            title: 'Patch handlers retry',
            updatedAt: 3,
            metadata: {
                ...(createRetryableTask().metadata || {}),
                retryOfTaskId: 'task-1',
                retrySourceTaskId: 'task-1',
                retrySequence: 1
            }
        };
        appRpc.codingTasks = [rootTask, retryableTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/retry';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toEqual('Retry coding tasks');
        expect(component.sessionState.selectMenu?.hint).toEqual(component.sessionState.consoleOptions.selectHint);
        expect(component.sessionState.selectMenu?.options.length).toEqual(1);
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('task-2');
        expect(component.sessionState.selectMenu?.options[0]?.description).toContain('retry 1');
        expect(component.sessionState.selectMenu?.options[0]?.description).toContain('from task-1');

        await component.sessionState.confirmSelectMenu('task-2');
        await pending;

        expect(appRpc.calls.some(call => call.method === 'coding_task.retry_failed' && call.params?.taskId === 'task-2')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-2-retry');
        expect(component.notice).toEqual('Retried failed workers from task-2 as task-2-retry.');
    }

    @Test('retry command falls back to selector when focused task is not retryable')
    async retryCommandFallsBackToSelectorWhenFocusedTaskIsNotRetryable() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const rootTask = createReviewTask();
        const retryableTask = {
            ...createRetryableTask(),
            id: 'task-2',
            title: 'Patch handlers retry',
            updatedAt: 1,
            metadata: {
                ...(createRetryableTask().metadata || {}),
                retryOfTaskId: 'task-1',
                retrySourceTaskId: 'task-1',
                retrySequence: 1
            }
        };
        appRpc.codingTasks = [rootTask, retryableTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        expect(component.sessionState.selectedTask?.id).toEqual('task-1');

        component.input = '/retry';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toEqual('Retry coding tasks');
        expect(component.sessionState.selectMenu?.options.length).toEqual(1);
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('task-2');

        await component.sessionState.confirmSelectMenu('task-2');
        await pending;

        expect(appRpc.calls.some(call => call.method === 'coding_task.retry_failed' && call.params?.taskId === 'task-2')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-2-retry');
    }

    @Test('rollback command rolls back direct task id and refreshes review')
    async rollbackCommandRollsBackDirectTaskIdAndRefreshesReview() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/rollback task-1';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'coding_task.rollback' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewTask?.status).toEqual('rolled_back');
        expect(component.notice).toEqual('Rolled back task-1.');
    }

    @Test('rollback command opens selector when no task is focused')
    async rollbackCommandOpensSelectorWhenNoTaskIsFocused() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const rootTask = createReviewTask();
        const retryTask = {
            ...createReviewTask(),
            id: 'task-2',
            title: 'Patch handlers retry',
            updatedAt: 3,
            metadata: {
                ...(createReviewTask().metadata || {}),
                retryOfTaskId: 'task-1',
                retrySourceTaskId: 'task-1',
                retrySequence: 1
            }
        };
        appRpc.codingTasks = [rootTask, retryTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/rollback';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toEqual('Rollback coding tasks');
        expect(component.sessionState.selectMenu?.hint).toEqual(component.sessionState.consoleOptions.selectHint);
        expect(component.sessionState.selectMenu?.options.length).toEqual(2);
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('task-1');
        expect(component.sessionState.selectMenu?.options[0]?.description).toContain('root');
        expect(component.sessionState.selectMenu?.options[1]?.label).toContain('task-2');
        expect(component.sessionState.selectMenu?.options[1]?.description).toContain('retry 1');

        await component.sessionState.confirmSelectMenu('task-2');
        await pending;

        expect(appRpc.calls.some(call => call.method === 'coding_task.rollback' && call.params?.taskId === 'task-2')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-2');
        expect(component.sessionState.reviewTask?.status).toEqual('rolled_back');
        expect(component.notice).toEqual('Rolled back task-2.');
    }

    @Test('rollback command falls back to selector when focused task is not rollbackable')
    async rollbackCommandFallsBackToSelectorWhenFocusedTaskIsNotRollbackable() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const blockedTask = {
            ...createCancelableTask(),
            id: 'task-2',
            title: 'Blocked refactor',
            updatedAt: 3,
            metadata: {
                checkpoints: []
            }
        };
        const rollbackTask = {
            ...createReviewTask(),
            id: 'task-1',
            title: 'Patch handlers',
            updatedAt: 2
        };
        appRpc.codingTasks = [blockedTask, rollbackTask];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = '/tasks';
        await component.submit();
        expect(component.sessionState.selectedTask?.id).toEqual('task-2');

        component.input = '/rollback';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toEqual('Rollback coding tasks');
        expect(component.sessionState.selectMenu?.options.length).toEqual(1);
        expect(component.sessionState.selectMenu?.options[0]?.label).toContain('task-1');

        await component.sessionState.confirmSelectMenu('task-1');
        await pending;

        expect(appRpc.calls.some(call => call.method === 'coding_task.rollback' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.sessionState.reviewTask?.id).toEqual('task-1');
        expect(component.sessionState.reviewTask?.status).toEqual('rolled_back');
    }

    @Test('rollback command uses focused review task when no arg is provided')
    async rollbackCommandUsesFocusedReviewTaskWhenNoArgIsProvided() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const reviewTask = createReviewTask();
        appRpc.codingTaskDetails.set('task-1', reviewTask);
        appRpc.codingTaskDiffs.set('task-1', {
            sessionId: 'console',
            taskId: 'task-1',
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.openReview(reviewTask as any, {
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: reviewTask.result.workers
        });

        component.input = '/rollback';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'coding_task.rollback' && call.params?.taskId === 'task-1')).toEqual(true);
        expect(component.notice).toEqual('Rolled back task-1.');
    }

    @Test('rollback command ignores stale results after opening task inspector')
    async rollbackCommandIgnoresStaleResultsAfterOpeningTaskInspector() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const deferred = createDeferred<any>();
        const reviewTask = createReviewTask();
        const otherTask = {
            ...createReviewTask(),
            id: 'task-b',
            title: 'Task B',
            updatedAt: 3
        };
        appRpc.codingTasks = [reviewTask, otherTask];
        appRpc.codingTaskRollbackHandlers.set('task-1', () => deferred.promise);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        await component.onInit();
        const pending = (component as any).rollbackCodingTask('task-1');
        await Promise.resolve();

        await (component as any).openCodingTaskInspector('task-b');
        deferred.resolve({
            sessionId: 'console',
            taskId: 'task-1',
            rolledBack: true,
            task: {
                ...reviewTask,
                status: 'rolled_back'
            }
        });
        await pending;

        expect(component.sessionState.tasksFocused).toEqual(true);
        expect(component.sessionState.reviewOpen).toEqual(false);
        expect(component.sessionState.selectedTask?.id).toEqual('task-b');
        expect(component.notice).toEqual('');
    }

    @Test('model command switches configured named profile')
    async modelCommandSwitchesConfiguredNamedProfile() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {
                ui: { title: 'Console' },
                model: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    defaultProfile: 'flash',
                    profiles: {
                        flash: { provider: 'deepseek', model: 'deepseek-v4-flash' },
                        strong: { provider: 'deepseek', model: 'deepseek-v4-pro', reasoning: true }
                    }
                }
            }
        );

        await component.onInit();
        component.input = '/model strong';
        await component.submit();

        expect(component.sessionState.modelProfile).toEqual('strong');
        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-pro');
        expect(component.notice).toEqual('Switched model profile to strong.');
    }

    @Test('model command uses app rpc for profile listing and activation')
    async modelCommandUsesAppRpcForProfileListingAndActivation() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.state = {
            sessionId: 'console',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            workspace: '/tmp/workspace',
            title: 'Console'
        };
        appRpc.modelProfiles = [
            { name: 'flash', selected: true, provider: 'deepseek', model: 'deepseek-v4-flash' },
            { name: 'strong', selected: false, provider: 'deepseek', model: 'deepseek-v4-pro' }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        await component.onInit();
        component.input = '/model strong';
        await component.submit();

        expect(appRpc.calls.some(call => call.method === 'model.activate' && call.params?.name === 'strong')).toEqual(true);
        expect(component.sessionState.modelProfile).toEqual('strong');
        expect(component.model).toEqual('deepseek-v4-pro');
    }

    @Test('model once queues next-turn profile without changing the session default')
    async modelOnceQueuesNextTurnProfileWithoutSwitchingDefault() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {
                ui: { title: 'Console' },
                model: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    defaultProfile: 'flash',
                    profiles: {
                        flash: { provider: 'deepseek', model: 'deepseek-v4-flash' },
                        strong: { provider: 'deepseek', model: 'deepseek-v4-pro', reasoning: true }
                    }
                }
            }
        );

        await component.onInit();
        component.input = '/model once strong';
        await component.submit();

        expect(component.sessionState.modelProfile).toEqual('flash');
        expect(component.sessionState.oneShotModelProfile).toEqual('strong');
        expect(component.notice).toEqual('Queued model profile strong for the next prompt.');
    }

    @Test('model once forwards profile for a single rpc turn then clears it')
    async modelOnceForwardsProfileForSingleRpcTurnThenClearsIt() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.state = {
            sessionId: 'console',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            workspace: '/tmp/workspace',
            title: 'Console'
        };
        appRpc.streamChunks = [
            { type: 'text', content: 'done' },
            { type: 'done' }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        await component.onInit();
        component.input = '/model once strong';
        await component.submit();
        component.input = 'hello';
        await component.submit();

        const streamCall = appRpc.calls.find(call => call.method === 'run.turn_stream');
        expect(streamCall?.params?.profile).toEqual('strong');
        expect(component.sessionState.oneShotModelProfile).toEqual('');
        expect(component.sessionState.modelProfile).toEqual('flash');
    }

    @Test('model activation ignores stale app rpc results after switching sessions')
    async modelActivationIgnoresStaleAppRpcResultsAfterSwitchingSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const sessionService = new SessionServiceStub(runtime);
        const deferred = createDeferred<any>();
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 2 },
            { id: 'chat-b', current: false, lastActiveAt: 1 }
        ];
        appRpc.state = {
            sessionId: 'chat-a',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            workspace: '/tmp/workspace',
            title: 'Console'
        };
        appRpc.modelProfiles = [
            { name: 'flash', selected: true, provider: 'deepseek', model: 'deepseek-v4-flash' },
            { name: 'strong', selected: false, provider: 'deepseek', model: 'deepseek-v4-pro' }
        ];
        appRpc.modelActivateHandlers.set('strong', () => deferred.promise);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);

        await component.onInit();
        const activation = (component as any).activateModelProfile('strong');
        await Promise.resolve();

        await (component as any).openSession('chat-b');
        component.configure({ provider: 'openai', model: 'gpt-5-mini', modelProfile: 'flash' });

        deferred.resolve({
            modelProfile: 'strong',
            provider: 'deepseek',
            model: 'deepseek-v4-pro'
        });
        await activation;

        expect(component.sessionId).toEqual('chat-b');
        expect(component.provider).toEqual('openai');
        expect(component.model).toEqual('gpt-5-mini');
        expect(component.sessionState.modelProfile).toEqual('flash');
    }

    @Test('event bridge refreshes tools through app rpc when available')
    async eventBridgeRefreshesToolsThroughAppRpcWhenAvailable() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const appRpc = new AppRpcStub();
        appRpc.tools = [
            { name: 'read_file', toolset: 'filesystem', activation: { kind: 'deferred', activated: true } }
        ];
        const { component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app, undefined, undefined, undefined, appRpc);

        await component.onInit();
        await app.eventMulticaster.emit(new AgentToolCompletedEvent(component as any, 'console', 'read_file', { durationMs: 1 } as any));

        expect(appRpc.calls.some(call => call.method === 'tools.list')).toEqual(true);
        expect(component.tools[0].active).toEqual(true);
    }

    @Test('focused approval panel accepts letter shortcuts from terminal input')
    async focusedApprovalPanelAcceptsLetterShortcuts() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const resolved: Array<{ decision: 'approve' | 'deny'; requestId: string }> = [];
        state.setPendingApprovals([
            {
                id: 'approval-1',
                toolName: 'write_file',
                sessionId: 'console',
                reason: 'Writing files requires approval.',
                summary: 'Writing files requires approval.',
                hasInput: true,
                createdAt: 1,
                timeoutMs: 30000
            } as any
        ]);
        state.resolveApprovalAction = async (decision, requestId) => {
            resolved.push({ decision, requestId });
        };
        state.setApprovalsFocused(true);

        const result = await state.processDecodedInput(
            { text: 'a', partial: false },
            'a',
            {
                isClosed: false,
                onExit() {},
                hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state),
            }
        );

        expect(result.handled).toEqual(true);
        expect(resolved).toEqual([{ decision: 'approve', requestId: 'approval-1' }]);
    }

    @Test('configured model label is preserved after model completion events')
    async preservesConfiguredModelLabel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({
            sessionId: 'chat-model',
            provider: 'openai-compatible',
            model: 'redhus',
            modelProfile: 'flash'
        });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-model', {
            metadata: {
                provider: 'openai-compatible',
                model: 'rehdasu',
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 12,
                    total_tokens: 22
                }
            }
        } as any));

        expect(component.provider).toEqual('openai-compatible');
        expect(component.model).toEqual('redhus');
    }

    @Test('tracks pending approvals through event bridge')
    async tracksPendingApprovalsThroughEventBridge() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-approval' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, {
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'chat-approval',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval. Summary: {"path":"notes.txt"}',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            timeoutMs: 30000
        }));

        expect(state.pendingApprovals.length).toEqual(1);
        expect(state.pendingApprovals[0].toolName).toEqual('write_file');

        await app.eventMulticaster.emit(new AgentApprovalCompletedEvent(this, {
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'chat-approval'
        }, true));

        expect(state.pendingApprovals).toEqual([]);

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, {
            id: 'approval-2',
            toolName: 'terminal',
            sessionId: 'chat-approval',
            reason: 'Shell execution requires approval.',
            summary: 'Shell execution requires approval.',
            hasInput: false,
            timeoutMs: 30000
        }));

        await app.eventMulticaster.emit(new AgentApprovalFailedEvent(this, {
            id: 'approval-2',
            toolName: 'terminal',
            sessionId: 'chat-approval'
        }, new Error('Approval timeout')));

        expect(state.pendingApprovals).toEqual([]);
        expect(state.lastError).toEqual('Approval timeout');
        expect(state.displayMessages.some(message => String(message.content || '').includes('Approval timeout'))).toEqual(false);
    }

    @Test('session state supports focused approval list navigation')
    sessionStateSupportsFocusedApprovalListNavigation() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setPendingApprovals([
            {
                id: 'approval-1',
                toolName: 'write_file',
                sessionId: 'console',
                reason: 'Writing files requires approval.',
                summary: 'Writing files requires approval.',
                hasInput: true,
                createdAt: 1,
                timeoutMs: 30000
            } as any,
            {
                id: 'approval-2',
                toolName: 'terminal',
                sessionId: 'console',
                reason: 'Shell execution requires approval.',
                summary: 'Shell execution requires approval.',
                hasInput: true,
                createdAt: 2,
                timeoutMs: 60000
            } as any
        ]);

        expect(state.selectedApproval?.id).toEqual('approval-1');

        state.setApprovalsFocused(true);
        expect(state.approvalsFocused).toEqual(true);

        state.moveApprovalSelection(1);
        expect(state.selectedApproval?.id).toEqual('approval-2');

        state.setSelectedApprovalId('approval-1');
        expect(state.selectedApproval?.id).toEqual('approval-1');

        state.setApprovalsFocused(false);
        expect(state.approvalsFocused).toEqual(false);
    }

    @Test('session state supports coding task review focus, file navigation, and scroll')
    async sessionStateSupportsCodingTaskReviewFocusFileNavigationAndScroll() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const reviewTask = createReviewTask();
        (reviewTask as any).metadata = {
            ...(reviewTask.metadata || {}),
            retryOfTaskId: 'task-0',
            retryOfWorkerIds: ['worker-2'],
            carryForwardWorkerIds: ['worker-1'],
            retrySequence: 1
        };
        state.setReviewTasks([{
            id: 'task-0',
            title: 'Initial patch',
            status: 'failed',
            executionMode: 'parallel',
            lineageTaskCount: 2
        } as any, {
            id: 'task-1',
            title: 'Patch handlers',
            status: 'completed',
            executionMode: 'parallel',
            retryOfTaskId: 'task-0',
            lineageRootTaskId: 'task-0',
            retryDepth: 1,
            lineageTaskCount: 2
        } as any]);
        state.setSelectedReviewTaskId('task-1');

        state.openReview(reviewTask as any, {
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: [
                    'diff --git a/src/a.ts b/src/a.ts',
                    '+new line',
                    '+second line',
                    'diff --git a/src/b.ts b/src/b.ts',
                    '-old line',
                    '+updated line'
                ].join('\n')
            },
            workers: [{
                workerId: 'worker-1',
                actionIds: ['edit-1'],
                status: 'completed',
                branch: 'coding-task/task1worker1',
                worktreePath: '.worktrees/task1worker1',
                diff: {
                    text: 'diff --git a/src/a.ts b/src/a.ts\n+new line\n+second line'
                }
            }, {
                workerId: 'worker-2',
                actionIds: ['edit-2'],
                status: 'completed',
                branch: 'coding-task/task1worker2',
                worktreePath: '.worktrees/task1worker2',
                diff: {
                    text: 'diff --git a/src/b.ts b/src/b.ts\n-old line\n+updated line'
                }
            }]
        });

        expect(state.reviewOpen).toEqual(true);
        expect(state.focusController.hasReviewFocus()).toEqual(true);
        expect(state.reviewExecutionMode).toEqual('parallel');
        expect(state.selectedReviewGroup?.key).toEqual('aggregate');
        expect(state.selectedReviewFileIndex).toEqual(0);
        expect(state.selectedReviewFileSection?.path).toEqual('src/a.ts');
        expect(state.reviewDetailLines.join('\n')).toContain('worker-1');
        expect(state.reviewDetailLines.join('\n')).toContain('worker-2');
        expect(state.reviewDetailLines.join('\n')).toContain('Review: ready · rollback available · lineage 2/2');
        expect(state.reviewDetailLines.join('\n')).toContain('Scope: 2 files changed · 2 workers · lineage 2 tasks');
        expect(state.reviewDetailLines.join('\n')).toContain('Groups: 3');
        expect(state.reviewDetailLines.join('\n')).toContain('› [1/3] aggregate · aggregate');
        expect(state.reviewDetailLines.join('\n')).toContain('[2/3] worker-1 · worker');
        expect(state.reviewDetailLines.join('\n')).toContain('[3/3] worker-2 · worker');
        expect(state.reviewDetailLines.join('\n')).toContain('Rollback: available');
        expect(state.reviewDetailLines.join('\n')).toContain('Retry Workers: worker-2');
        expect(state.reviewDetailLines.join('\n')).toContain('Carry Forward: worker-1');
        expect(state.reviewDetailLines.join('\n')).toContain('Checkpoints: 1 total');
        expect(state.reviewDetailLines.join('\n')).toContain('Files: 2');
        expect(state.reviewDetailLines.join('\n')).toContain('› [1/2] src/a.ts (+2 -0)');
        expect(state.reviewDetailLines.join('\n')).toContain('  [2/2] src/b.ts (+1 -1)');
        expect(state.reviewDetailLines.join('\n')).toContain('Current File: src/a.ts (+2 -0)');
        expect(state.reviewDetailLines.join('\n')).toContain('diff --git a/src/a.ts b/src/a.ts');
        expect(state.reviewDetailLines.join('\n')).not.toContain('diff --git a/src/b.ts b/src/b.ts');

        state.scrollReviewDetail(1);
        expect(state.reviewDetailScroll).toEqual(1);

        await state.handleFocusKey(']', navigationFor(state));
        expect(state.selectedReviewFileIndex).toEqual(1);
        expect(state.selectedReviewFileSection?.path).toEqual('src/b.ts');
        expect(state.reviewDetailScroll).toEqual(0);
        expect(state.reviewDetailLines.join('\n')).toContain('Current File: src/b.ts (+1 -1)');
        expect(state.reviewDetailLines.join('\n')).toContain('diff --git a/src/b.ts b/src/b.ts');
        expect(state.reviewDetailLines.join('\n')).not.toContain('diff --git a/src/a.ts b/src/a.ts');

        await state.handleFocusKey('a', navigationFor(state));
        expect(state.selectedReviewPatchFilter).toEqual('additions');
        expect(state.reviewDetailLines.join('\n')).toContain('Patch Filter: additions');
        expect(state.reviewDetailLines.join('\n')).toContain('+updated line');
        expect(state.reviewDetailLines.join('\n')).not.toContain('-old line');

        await state.handleFocusKey('u', navigationFor(state));
        expect(state.selectedReviewPatchFilter).toEqual('all');
        expect(state.reviewDetailLines.join('\n')).toContain('-old line');

        await state.handleFocusKey('.', navigationFor(state));
        expect(state.selectedReviewGroup?.workerId).toEqual('worker-1');
        expect(state.selectedReviewFileIndex).toEqual(0);
        expect(state.selectedReviewFileSection?.path).toEqual('src/a.ts');
        expect(state.reviewDetailLines.join('\n')).toContain('Current Group: worker-1 · worker · status completed · 1 file');
        expect(state.reviewDetailLines.join('\n')).toContain('Worker Branch: coding-task/task1worker1');
        expect(state.reviewDetailLines.join('\n')).toContain('Current File: src/a.ts (+2 -0)');
        expect(state.reviewDetailLines.join('\n')).not.toContain('diff --git a/src/b.ts b/src/b.ts');

        const maxReviewScroll = Math.max(0, state.reviewDetailLines.length - state.consoleOptions.reviewDetailVisibleLines);
        state.scrollReviewDetail(1);
        expect(state.reviewDetailScroll).toEqual(Math.min(1, maxReviewScroll));

        state.scrollReviewDetailColumns(5);
        expect(state.reviewDetailColumnScroll).toEqual(5);

        state.closeReview();
        expect(state.reviewOpen).toEqual(false);
        expect(state.reviewDetailScroll).toEqual(0);
        expect(state.reviewDetailColumnScroll).toEqual(0);
    }

    @Test('review detail flags risks for failed tasks without rollback')
    reviewDetailFlagsRisksForFailedTasksWithoutRollback() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const failedTask = {
            ...createReviewTask(),
            status: 'failed',
            result: {
                ...createReviewTask().result,
                aggregate: {
                    totalWorkers: 1,
                    completedWorkers: 0,
                    failedWorkers: 1,
                    status: 'failed',
                    isolatedFailures: [{
                        workerId: 'worker-1',
                        actionIds: ['edit-1'],
                        error: 'patch rejected'
                    }]
                },
                rollback: {
                    available: false
                },
                workers: [{
                    workerId: 'worker-1',
                    status: 'failed',
                    error: 'patch rejected'
                }]
            },
            metadata: {
                checkpoints: []
            }
        };

        state.openReview(failedTask as any, {
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
            },
            workers: failedTask.result.workers
        });

        expect(state.reviewDetailLines.join('\n')).toContain('Review: needs attention');
        expect(state.reviewDetailLines.join('\n')).toContain('Workers: failed · 0/1 completed · 1 failed');
        expect(state.reviewDetailLines.join('\n')).toContain('Risks: 1 worker failure · rollback unavailable');
        expect(state.reviewDetailLines.join('\n')).toContain('Worker Failures: worker-1: patch rejected');
    }

    @Test('review detail folds and expands hunks with the f key')
    async reviewDetailFoldsAndExpandsHunks() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openReview(createReviewTask() as any, {
            executionMode: 'parallel',
            diff: {
                summary: '1 file diff(s) captured',
                text: [
                    'diff --git a/src/a.ts b/src/a.ts',
                    '--- a/src/a.ts',
                    '+++ b/src/a.ts',
                    '@@ -1,2 +1,3 @@',
                    '-old first',
                    '+new first',
                    'context first',
                    '@@ -10,2 +11,2 @@',
                    '-old second',
                    '+new second',
                    'context second',
                    'diff --git a/src/b.ts b/src/b.ts',
                    '--- a/src/b.ts',
                    '+++ b/src/b.ts',
                    '@@ -1,1 +1,2 @@',
                    '-b old',
                    '+b new'
                ].join('\n')
            },
            workers: []
        });

        const unfolded = state.reviewDetailLines.join('\n');
        expect(unfolded).toContain('@@ -1,2 +1,3 @@');
        expect(unfolded).toContain('-old first');
        expect(unfolded).toContain('-old second');

        // jump to the second hunk and fold it
        await state.handleFocusKey('}', navigationFor(state));
        expect(state.selectedReviewHunkIndex).toEqual(1);
        await state.handleFocusKey('f', navigationFor(state));
        const folded = state.reviewDetailLines.join('\n');
        expect(folded).toContain('@@ -10,2 +11,2 @@');
        expect(folded).not.toContain('-old second');
        expect(folded).not.toContain('+new second');
        expect(folded).not.toContain('context second');
        expect(folded).toContain('folded hunk +1 -1');
        expect(folded).toContain('-old first');

        // the folded summary survives the additions patch filter
        await state.handleFocusKey('a', navigationFor(state));
        const filtered = state.reviewDetailLines.join('\n');
        expect(filtered).toContain('folded hunk +1 -1');
        expect(filtered).not.toContain('-old second');
        await state.handleFocusKey('u', navigationFor(state));

        // expanding restores the hunk body
        await state.handleFocusKey('f', navigationFor(state));
        const expanded = state.reviewDetailLines.join('\n');
        expect(expanded).toContain('-old second');
        expect(expanded).toContain('+new second');
        expect(expanded).not.toContain('folded hunk');

        // switching file resets the hunk index
        expect(state.selectedReviewHunkIndex).toEqual(1);
        await state.handleFocusKey(']', navigationFor(state));
        expect(state.selectedReviewFileIndex).toEqual(1);
        expect(state.selectedReviewHunkIndex).toEqual(0);
    }

    @Test('review detail toggles side-by-side patch rendering with the s key')
    async reviewDetailTogglesSideBySide() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openReview(createReviewTask() as any, {
            executionMode: 'parallel',
            diff: {
                summary: '1 file diff(s) captured',
                text: [
                    'diff --git a/src/a.ts b/src/a.ts',
                    '--- a/src/a.ts',
                    '+++ b/src/a.ts',
                    '@@ -1,3 +1,3 @@',
                    '-old first',
                    '+new first',
                    'context line',
                    '-old removed',
                    '+added',
                    '+extra'
                ].join('\n')
            },
            workers: []
        });

        const unified = state.reviewDetailLines.join('\n');
        expect(unified).toContain('-old first');
        expect(unified).toContain('+new first');
        expect(unified).not.toContain('│');

        await state.handleFocusKey('s', navigationFor(state));
        expect(state.reviewSideBySide).toEqual(true);
        const sxs = state.reviewDetailLines;
        const joined = sxs.join('\n');
        const pairRows = sxs.filter(line => line.includes('│'));
        expect(pairRows.length).toBeGreaterThan(0);
        expect(joined).not.toContain('-old first');
        expect(joined).not.toContain('+new first');
        expect(joined).toContain('old first');
        expect(joined).toContain('new first');
        expect(joined).toContain('context line');
        expect(joined).toContain('diff --git a/src/a.ts b/src/a.ts');
        expect(joined).toContain('@@ -1,3 +1,3 @@');

        // additions filter keeps pair rows with an empty old column
        await state.handleFocusKey('a', navigationFor(state));
        const filtered = state.reviewDetailLines.join('\n');
        expect(filtered).toContain('│');
        expect(filtered).not.toContain('old first');
        expect(filtered).toContain('new first');

        // fold summary still renders in side-by-side mode
        await state.handleFocusKey('u', navigationFor(state));
        await state.handleFocusKey('}', navigationFor(state));
        await state.handleFocusKey('f', navigationFor(state));
        const folded = state.reviewDetailLines.join('\n');
        expect(folded).toContain('folded hunk');

        await state.handleFocusKey('s', navigationFor(state));
        expect(state.reviewSideBySide).toEqual(false);
    }

    @Test('review detail keeps large diffs scoped to the selected file')
    reviewDetailKeepsLargeDiffsScopedToSelectedFile() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const fileCount = 24;
        const diffLines: string[] = [];
        for (let index = 0; index < fileCount; index++) {
            diffLines.push(`diff --git a/src/file-${index}.ts b/src/file-${index}.ts`);
            diffLines.push(`--- a/src/file-${index}.ts`);
            diffLines.push(`+++ b/src/file-${index}.ts`);
            diffLines.push('@@ -1,1 +1,2 @@');
            diffLines.push(`-old line ${index}`);
            diffLines.push(`+new line ${index}`);
            diffLines.push(`+extra line ${index}`);
        }

        state.openReview(createReviewTask() as any, {
            executionMode: 'parallel',
            diff: {
                summary: `${fileCount} file diff(s) captured`,
                text: diffLines.join('\n')
            },
            workers: []
        });

        const lines = state.reviewDetailLines;
        expect(lines.join('\n')).toContain(`Files: ${fileCount}`);
        expect(lines.join('\n')).toContain('Current File: src/file-0.ts (+2 -1)');
        expect(lines.join('\n')).toContain('diff --git a/src/file-0.ts b/src/file-0.ts');
        expect(lines.join('\n')).not.toContain('diff --git a/src/file-23.ts b/src/file-23.ts');
        expect(lines.length).toBeLessThan(50);

        state.setSelectedReviewFileIndex(fileCount - 1);
        const tailLines = state.reviewDetailLines.join('\n');
        expect(tailLines).toContain('Current File: src/file-23.ts (+2 -1)');
        expect(tailLines).toContain('diff --git a/src/file-23.ts b/src/file-23.ts');
        expect(tailLines).not.toContain('diff --git a/src/file-0.ts b/src/file-0.ts');
    }

    @Test('openSession aggregates project summary, todo, and coding tasks across related sessions')
    async openSessionAggregatesProjectArtifactsAcrossSessions() {
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
        appRpc.todoPlanBySession.set('chat-a', [{ id: 'todo-a', content: 'done item', status: 'completed' }]);
        appRpc.todoPlanBySession.set('chat-b', [{ id: 'todo-b', content: 'active item', status: 'in_progress' }]);
        appRpc.codingTasksBySession.set('chat-a', [{ id: 'task-a', title: 'Task A', updatedAt: 10, status: 'completed' }]);
        appRpc.codingTasksBySession.set('chat-b', [{
            id: 'task-b',
            title: 'Task B',
            updatedAt: 20,
            status: 'running',
            metadata: {
                retryOfTaskId: 'task-a',
                retrySourceTaskId: 'task-a',
                retrySequence: 1
            }
        }]);

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);
        await (component as any).openSession('chat-a');

        expect(component.sessionState.projectLabel).toEqual('exam-system');
        expect(component.sessionState.projectSummary).toEqual('latest project summary');
        expect(component.sessionState.planTodos.map(item => item.id)).toEqual(['todo-b']);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('chat-b');
        expect(component.sessionState.reviewTaskChoices.map(item => ({
            id: item.id,
            sourceSessionId: item.sourceSessionId,
            retryOfTaskId: item.retryOfTaskId,
            retryDepth: item.retryDepth,
            lineageTaskCount: item.lineageTaskCount
        }))).toEqual([
            { id: 'task-a', sourceSessionId: 'chat-a', retryOfTaskId: undefined, retryDepth: undefined, lineageTaskCount: 2 },
            { id: 'task-b', sourceSessionId: 'chat-b', retryOfTaskId: 'task-a', retryDepth: 1, lineageTaskCount: 2 }
        ]);
    }

    @Test('review requests use the source session for aggregated project tasks')
    async reviewRequestsUseTheSourceSessionForAggregatedProjectTasks() {
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
                { id: 'chat-a', workspace: '/tmp/project-a', messageCount: 2, lastActiveAt: 10 },
                { id: 'chat-b', workspace: '/tmp/project-b', messageCount: 3, lastActiveAt: 20 }
            ]
        }];
        const appRpc = new AppRpcStub();
        appRpc.codingTasksBySession.set('chat-a', []);
        appRpc.codingTasksBySession.set('chat-b', [{
            id: 'task-b',
            title: 'Task B',
            updatedAt: 20,
            status: 'running'
        }]);
        appRpc.codingTaskDetails.set('task-b', {
            id: 'task-b',
            title: 'Task B',
            sourceSessionId: 'chat-b',
            status: 'running'
        });
        appRpc.codingTaskDiffs.set('task-b', {
            sessionId: 'chat-b',
            taskId: 'task-b',
            executionMode: 'parallel',
            diff: { summary: 'Aggregated diff' },
            workers: []
        });

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);
        await (component as any).openSession('chat-a');
        await (component as any).openCodingTaskReview('task-b');

        expect(appRpc.calls.some(call => call.method === 'coding_task.diff' && call.params?.sessionId === 'chat-b' && call.params?.taskId === 'task-b')).toEqual(true);
        expect(component.sessionState.reviewTask?.sourceSessionId).toEqual('chat-b');
    }

    @Test('loadThreadCodingTasks aggregates coding tasks within the thread only')
    async loadThreadCodingTasksAggregatesWithinThreadOnly() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.codingTasksBySession.set('chat-a', [{ id: 'task-a', title: 'root task', updatedAt: 10, status: 'completed' }]);
        appRpc.codingTasksBySession.set('worker-b', [{ id: 'task-b', title: 'worker task', updatedAt: 20, status: 'running' }]);
        appRpc.codingTasksBySession.set('other-d', [{ id: 'task-d', title: 'other thread task', updatedAt: 30, status: 'running' }]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        component.sessionState.configure({ sessionId: 'chat-a' });
        component.sessionState.setSessions([
            { id: 'chat-a', current: true, updatedAt: 10, primaryThreadId: 'thread-1' } as any,
            { id: 'worker-b', current: false, updatedAt: 20, originThreadId: 'thread-1' } as any,
            { id: 'other-d', current: false, updatedAt: 30, primaryThreadId: 'thread-2' } as any
        ]);

        await (component as any).loadThreadCodingTasks();

        expect(component.sessionState.taskRecords.map((task: any) => task.id).sort()).toEqual(['task-a', 'task-b']);
        const taskListSessionIds = appRpc.calls
            .filter(call => call.method === 'coding_task.list')
            .map(call => String(call.params?.sessionId || ''))
            .sort();
        expect(taskListSessionIds).toEqual(['chat-a', 'worker-b']);
    }

    @Test('threadplan command aggregates thread plan todos and focuses the tasks panel')
    async threadPlanCommandAggregatesThreadTodosAndFocusesTasksPanel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.todoPlanBySession.set('chat-a', [{ id: 'todo-a', content: 'root todo', status: 'in_progress' }]);
        appRpc.codingTasksBySession.set('worker-b', [{ id: 'task-b', title: 'worker task', updatedAt: 10, status: 'running' }]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        component.sessionState.configure({ sessionId: 'chat-a' });
        component.sessionState.setSessions([
            { id: 'chat-a', current: true, updatedAt: 10, primaryThreadId: 'thread-1' } as any,
            { id: 'worker-b', current: false, updatedAt: 20, originThreadId: 'thread-1' } as any
        ]);

        await (component as any).handleCommand('/threadplan');

        expect(component.sessionState.planTodos.map(item => item.id)).toEqual(['todo-a']);
        expect(component.sessionState.planScope).toEqual('thread');
        expect(component.sessionState.tasksFocused).toEqual(true);
    }

    @Test('threadreview command opens review scoped to the current thread')
    async threadReviewCommandOpensReviewScopedToCurrentThread() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.codingTasksBySession.set('chat-a', [{ id: 'task-a', title: 'root task', updatedAt: 10, status: 'completed' }]);
        appRpc.codingTasksBySession.set('worker-b', [{ id: 'task-b', title: 'worker task', updatedAt: 20, status: 'running' }]);
        appRpc.codingTasksBySession.set('other-d', [{ id: 'task-d', title: 'other thread task', updatedAt: 30, status: 'running' }]);
        appRpc.codingTaskDetails.set('task-b', { id: 'task-b', title: 'worker task', sourceSessionId: 'worker-b', status: 'running' });
        appRpc.codingTaskDiffs.set('task-b', {
            sessionId: 'worker-b',
            taskId: 'task-b',
            executionMode: 'parallel',
            diff: { summary: 'thread diff' },
            workers: []
        });
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        component.sessionState.configure({ sessionId: 'chat-a' });
        component.sessionState.setSessions([
            { id: 'chat-a', current: true, updatedAt: 10, primaryThreadId: 'thread-1' } as any,
            { id: 'worker-b', current: false, updatedAt: 20, originThreadId: 'thread-1' } as any,
            { id: 'other-d', current: false, updatedAt: 30, primaryThreadId: 'thread-2' } as any
        ]);
        (component as any).select = async (_title: string, options: Array<{ value: string }>) => options[0]?.value || null;

        await (component as any).handleCommand('/threadreview');

        const taskListSessionIds = appRpc.calls
            .filter(call => call.method === 'coding_task.list')
            .map(call => String(call.params?.sessionId || ''))
            .sort();
        expect(taskListSessionIds).toEqual(['chat-a', 'worker-b']);
        expect(component.sessionState.reviewTask?.id).toEqual('task-b');
    }

    @Test('loadCodingTasks ignores failed project sessions and clears stale tasks')
    async loadCodingTasksIgnoresFailedProjectSessionsAndClearsStaleTasks() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.codingTaskFailuresBySession.add('chat-b');
        appRpc.codingTasksBySession.set('chat-a', [{ id: 'task-a', title: 'Task A', updatedAt: 10, status: 'running' }]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        component.sessionState.configure({ sessionId: 'chat-a' });
        component.sessionState.setSessions([
            { id: 'chat-a', current: true, updatedAt: 10, projectKey: 'project:exam-system' } as any,
            { id: 'chat-b', current: false, updatedAt: 20, projectKey: 'project:exam-system' } as any
        ]);
        component.sessionState.setTaskRecords([{ id: 'stale-task' } as any]);
        component.sessionState.setReviewTasks([{ id: 'stale-task', title: 'Stale task' } as any]);

        const tasks = await (component as any).loadCodingTasks();

        expect(tasks.map((item: any) => item.id)).toEqual(['task-a']);
        expect(component.sessionState.reviewTaskChoices.map(item => item.id)).toEqual(['task-a']);
        expect(component.sessionState.taskRecords.map(item => item.id)).toEqual(['task-a']);

        appRpc.codingTaskFailuresBySession.add('chat-a');
        const emptyTasks = await (component as any).loadCodingTasks();

        expect(emptyTasks).toEqual([]);
        expect(component.sessionState.reviewTaskChoices).toEqual([]);
        expect(component.sessionState.taskRecords).toEqual([]);
    }

    @Test('review annotations are isolated by review scope key')
    async reviewAnnotationsAreIsolatedByReviewScopeKey() {
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
                { id: 'chat-a', workspace: '/tmp/project-a', messageCount: 2, lastActiveAt: 10 },
                { id: 'chat-b', workspace: '/tmp/project-b', messageCount: 3, lastActiveAt: 20 }
            ]
        }];
        const appRpc = new AppRpcStub();
        appRpc.codingTaskDetails.set('task-a', {
            id: 'task-a',
            title: 'Task A',
            sourceSessionId: 'chat-a',
            status: 'running'
        });
        appRpc.codingTaskDetails.set('task-b', {
            id: 'task-b',
            title: 'Task B',
            sourceSessionId: 'chat-b',
            status: 'running'
        });
        appRpc.codingTaskDiffs.set('task-a', {
            sessionId: 'chat-a',
            taskId: 'task-a',
            executionMode: 'parallel',
            diff: {
                summary: 'Task A diff',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+task a'
            },
            workers: []
        });
        appRpc.codingTaskDiffs.set('task-b', {
            sessionId: 'chat-b',
            taskId: 'task-b',
            executionMode: 'parallel',
            diff: {
                summary: 'Task B diff',
                text: 'diff --git a/src/b.ts b/src/b.ts\n+task b'
            },
            workers: []
        });
        appRpc.reviewAnnotationCacheByKey.set('chat-a:task-a', {
            'src/a.ts': { status: 'approved', comment: 'task a', createdAt: '2026-07-30T00:00:00.000Z' }
        });
        appRpc.reviewAnnotationCacheByKey.set('chat-b:task-b', {
            'src/b.ts': { status: 'rejected', comment: 'task b', createdAt: '2026-07-30T00:00:00.000Z' }
        });

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);
        await (component as any).openCodingTaskReview('task-a');
        expect(component.sessionState.reviewFileAnnotations['src/a.ts']?.status).toEqual('approved');
        await (component as any).openCodingTaskReview('task-b');
        expect(component.sessionState.reviewFileAnnotations['src/b.ts']?.status).toEqual('rejected');
        expect(component.sessionState.reviewFileAnnotations['src/a.ts']).toBeUndefined();
        expect(appRpc.calls.some(call => call.method === 'review_annotations.load' && call.params?.cacheKey === 'chat-a:task-a')).toEqual(true);
        expect(appRpc.calls.some(call => call.method === 'review_annotations.load' && call.params?.cacheKey === 'chat-b:task-b')).toEqual(true);
    }

    @Test('review annotations restore after recreating the console for the same task scope')
    async reviewAnnotationsRestoreAfterRecreatingConsoleForTheSameTaskScope() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [{
            projectKey: 'project:exam-system',
            projectId: 'exam-system',
            label: 'exam-system',
            workspace: '/tmp/project-a',
            sessionCount: 1,
            lastActiveAt: 20,
            sessions: [
                { id: 'chat-a', workspace: '/tmp/project-a', messageCount: 2, lastActiveAt: 20 }
            ]
        }];
        const appRpc = new AppRpcStub();
        appRpc.codingTaskDetails.set('task-a', {
            id: 'task-a',
            title: 'Task A',
            sourceSessionId: 'chat-a',
            status: 'running'
        });
        appRpc.codingTaskDiffs.set('task-a', {
            sessionId: 'chat-a',
            taskId: 'task-a',
            executionMode: 'parallel',
            diff: {
                summary: 'Task A diff',
                text: 'diff --git a/src/a.ts b/src/a.ts\n+task a'
            },
            workers: []
        });

        const firstComponent = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);
        // onInit wires the annotation persist callback; the test helper builds the component directly, so wire it explicitly.
        firstComponent.sessionState.onReviewAnnotationsPersist = (cache) => (firstComponent as any).saveReviewAnnotationsCacheToDisk(cache);
        await (firstComponent as any).openCodingTaskReview('task-a');
        firstComponent.sessionState.setReviewFileAnnotation('approved', 'looks good', 'src/a.ts');

        const secondComponent = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc);
        await (secondComponent as any).openCodingTaskReview('task-a');

        expect(secondComponent.sessionState.reviewFileAnnotations['src/a.ts']).toEqual(expect.objectContaining({
            status: 'approved',
            comment: 'looks good'
        }));
    }

    @Test('session state isolates review annotations for duplicate task ids across sessions')
    sessionStateIsolatesReviewAnnotationsForDuplicateTaskIdsAcrossSessions() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const taskA = { id: 'task-1', title: 'Task A', sourceSessionId: 'chat-a', status: 'running' };
        const taskB = { id: 'task-1', title: 'Task B', sourceSessionId: 'chat-b', status: 'running' };

        state.openReview(taskA as any, {
            executionMode: 'parallel',
            diff: {
                text: 'diff --git a/src/a.ts b/src/a.ts\n+task a'
            },
            workers: []
        });
        state.setReviewFileAnnotation('approved', 'task a', 'src/a.ts');
        state.closeReview();

        state.openReview(taskB as any, {
            executionMode: 'parallel',
            diff: {
                text: 'diff --git a/src/b.ts b/src/b.ts\n+task b'
            },
            workers: []
        });
        expect(state.reviewFileAnnotations['src/a.ts']).toBeUndefined();
        state.setReviewFileAnnotation('rejected', 'task b', 'src/b.ts');
        state.closeReview();

        state.openReview(taskA as any, {
            executionMode: 'parallel',
            diff: {
                text: 'diff --git a/src/a.ts b/src/a.ts\n+task a'
            },
            workers: []
        });
        expect(state.reviewFileAnnotations['src/a.ts']?.status).toEqual('approved');
        expect(state.reviewFileAnnotations['src/b.ts']).toBeUndefined();
    }

    @Test('handleFocusKey approval navigation routes through controller (P266)')
    async handleFocusKeyApprovalRoutesThroughController() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setPendingApprovals([
            { id: 'a1', toolName: 't1', sessionId: 's', reason: 'r1', summary: 's1', hasInput: false, createdAt: 1, timeoutMs: 1000, expiresAt: 2 },
            { id: 'a2', toolName: 't2', sessionId: 's', reason: 'r2', summary: 's2', hasInput: false, createdAt: 1, timeoutMs: 1000, expiresAt: 2 },
            { id: 'a3', toolName: 't3', sessionId: 's', reason: 'r3', summary: 's3', hasInput: false, createdAt: 1, timeoutMs: 1000, expiresAt: 2 }
        ] as any);
        state.setApprovalsFocused(true);
        expect(state.selectedApprovalId).toEqual('a1');

        await state.handleFocusKey('down', navigationFor(state));
        expect(state.selectedApprovalId).toEqual('a2');
        await state.handleFocusKey('end', navigationFor(state));
        expect(state.selectedApprovalId).toEqual('a3');
        await state.handleFocusKey('home', navigationFor(state));
        expect(state.selectedApprovalId).toEqual('a1');
        await state.handleFocusKey('pagedown', navigationFor(state));
        expect(state.selectedApprovalId).toEqual('a3');
        await state.handleFocusKey('pageup', navigationFor(state));
        expect(state.selectedApprovalId).toEqual('a1');

        // approve/deny still fire through their own actions
        const resolved: Array<{ action: string; id: string }> = [];
        state.resolveApprovalAction = async (action, id) => { resolved.push({ action, id }); };
        await state.handleFocusKey('approve', navigationFor(state));
        expect(resolved).toEqual([{ action: 'approve', id: 'a1' }]);
        await state.handleFocusKey('deny', navigationFor(state));
        expect(resolved).toEqual([
            { action: 'approve', id: 'a1' },
            { action: 'deny', id: 'a1' }
        ]);
    }

    @Test('status command reports session, model, plan mode, and sandbox mode')
    async statusCommandReportsSessionState() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'st-1';
        state.setModelProfile('fast');
        state.setPlanMode(true);
        runtime.setSessionSandboxMode('st-1', 'workspace');

        await (component as any).handleCommand('/status');

        expect(state.notice).toContain('st-1');
        expect(state.notice).toContain('fast');
        expect(state.notice).toContain('ON (read-only)');
        expect(state.notice).toContain('sandbox workspace');
        expect(state.notice).toContain('delegation explicit');
        expect(state.textOverlay?.title).toBe('status');
        expect(state.textOverlay?.lines).toContain('session: st-1');
        expect(state.textOverlay?.lines).toContain('model: fast');
        expect(state.textOverlay?.lines).toContain('archetype: build');
        expect(state.textOverlay?.lines).toContain('plan mode: ON (read-only)');
        expect(state.textOverlay?.lines).toContain('sandbox: workspace');
        expect(state.textOverlay?.lines).toContain('delegation: explicit');
    }

    @Test('status command reports exchange metrics via RPC')
    async statusCommandReportsExchangeMetrics() {
        const runtime = new RuntimeStub();
        const appRpc = new AppRpcStub();
        appRpc.exchangeMetrics = { dropped: 1, stale: 2, duplicate: 3, unauthorized: 4 };
        const { state, component } = createConsoleParts(runtime, new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'st-1';
        state.setModelProfile('fast');

        await (component as any).handleCommand('/status');

        expect(state.notice).toContain('exchange d1 s2 dup3 u4');
        expect(state.textOverlay?.title).toBe('status');
        expect(state.textOverlay?.lines).toContain('exchange: dropped 1 · stale 2 · duplicate 3 · unauthorized 4');
    }

    @Test('settings providers tab opens the model switcher')
    async settingsProvidersTabOpensModelSwitcher() {
        const runtime = new RuntimeStub();
        const appRpc = new AppRpcStub();
        appRpc.modelProfiles = [
            { name: 'fast', provider: 'deepseek', model: 'deepseek-v4-flash', selected: false },
            { name: 'strong', provider: 'deepseek', model: 'deepseek-v4-pro', selected: true }
        ];
        const component = createConsole(runtime, new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        const pending = (component as any).handleCommand('/settings');
        await waitForCondition(() => !!component.selectMenu);
        await component.sessionState.confirmSelectMenu('providers');
        await waitForCondition(() => component.selectMenu?.title === 'Settings · Providers');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['model', 'thinking-level', 'fast', 'status']);

        await component.sessionState.confirmSelectMenu('model');
        await waitForCondition(() => component.selectMenu?.title === 'Model providers');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['__provider__:deepseek', '__add_provider__']);
        const chooseProvider = component.sessionState.confirmSelectMenu('__provider__:deepseek');
        await waitForCondition(() => component.selectMenu?.title === 'deepseek · model mode');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['auto', 'fast', 'balanced', 'strong']);
        await component.sessionState.confirmSelectMenu('fast');
        await chooseProvider;
        await pending;
    }

    @Test('add provider wizard masks the API key and persists three routing tiers')
    async addProviderWizardPersistsRoutes() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        const writes: any[] = [];
        (component as any).uiConfig = {
            resolve: () => ({ root: '/config' }),
            writeModelProfile: (root: string, profile: any) => writes.push({ root, profile })
        };

        (component as any).startProviderWizard();
        expect(component.sessionState.providerWizard?.phase).toEqual('choose');
        expect(component.selectMenu?.title).toEqual('Add provider · choose provider');
        await component.sessionState.confirmSelectMenu('custom-openai');

        expect(component.sessionState.inputPrompt).toEqual('2/9 › ');
        expect(component.sessionState.inputPlaceholderLabel).toEqual('API base URL');
        const baseUrl = 'https://api.acme.test/v1';
        component.sessionState.setInput(baseUrl, baseUrl.length);
        await component.submit();

        expect(component.selectMenu?.title).toEqual('Custom OpenAI-compatible · authentication');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['key', 'env']);
        await component.sessionState.confirmSelectMenu('key');

        expect(component.sessionState.inputSecret).toEqual(true);
        expect(component.sessionState.inputPlaceholderLabel).toEqual('API key');
        const secret = 'secret-key';
        component.sessionState.setInput(secret, secret.length);
        await component.submit();

        expect(component.selectMenu?.title).toEqual('Custom OpenAI-compatible · model routing');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['single', 'pair', 'auto']);
        await component.sessionState.confirmSelectMenu('auto');

        for (const value of ['acme-fast', 'acme-balanced', 'acme-strong']) {
            component.sessionState.setInput(value, value.length);
            await component.submit();
        }

        expect(component.selectMenu?.title).toEqual('Confirm provider');
        await component.sessionState.confirmSelectMenu('save');

        expect(component.sessionState.inputSecret).toEqual(false);
        expect(component.sessionState.providerWizard).toEqual(undefined);
        expect(writes.length).toEqual(1);
        expect(writes[0].root).toEqual('/config');
        expect(writes[0].profile.profiles['api-acme-test-fast'].apiKey).toEqual(secret);
        expect(writes[0].profile.complexityRouting).toEqual({
            simple: 'api-acme-test-fast', moderate: 'api-acme-test-balanced', complex: 'api-acme-test-strong'
        });
        expect(component.sessionState.inputHistoryEntries).not.toContain(secret);
    }

    @Test('add provider wizard sends collected fields through gateway rpc')
    async addProviderWizardUsesGatewayRpc() {
        const appRpc = new AppRpcStub();
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        (component as any).startProviderWizard();
        await component.sessionState.confirmSelectMenu('custom-openai');
        const baseUrl = 'https://remote.test/v1';
        component.sessionState.setInput(baseUrl, baseUrl.length);
        await component.submit();
        await component.sessionState.confirmSelectMenu('key');
        component.sessionState.setInput('remote-secret', 'remote-secret'.length);
        await component.submit();
        await component.sessionState.confirmSelectMenu('auto');
        for (const value of ['r-fast', 'r-balanced', 'r-strong']) {
            component.sessionState.setInput(value, value.length);
            await component.submit();
        }
        await component.sessionState.confirmSelectMenu('save');
        const call = appRpc.calls.find(item => item.method === 'model.add');
        expect(call?.params).toEqual({
            name: 'remote-test', provider: 'openai-compatible', baseUrl: 'https://remote.test/v1',
            apiKey: 'remote-secret', fastModel: 'r-fast', balancedModel: 'r-balanced', strongModel: 'r-strong'
        });
        expect(component.sessionState.inputHistoryEntries).not.toContain('remote-secret');
    }

    @Test('add provider wizard supports a single model referenced by environment variable')
    async addProviderWizardSingleModelUsesEnvVar() {
        const appRpc = new AppRpcStub();
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        (component as any).startProviderWizard();
        await component.sessionState.confirmSelectMenu('custom-openai');
        const baseUrl = 'https://solo.test/v1';
        component.sessionState.setInput(baseUrl, baseUrl.length);
        await component.submit();
        await component.sessionState.confirmSelectMenu('env');
        expect(component.sessionState.inputSecret).toEqual(false);
        expect(component.sessionState.input).toEqual('OPENAI_API_KEY');
        await component.submit();
        await component.sessionState.confirmSelectMenu('single');
        component.sessionState.setInput('solo-model', 'solo-model'.length);
        await component.submit();
        await component.sessionState.confirmSelectMenu('save');
        const call = appRpc.calls.find(item => item.method === 'model.add');
        expect(call?.params).toEqual({
            name: 'solo-test', provider: 'openai-compatible', baseUrl: 'https://solo.test/v1',
            apiKeyEnv: 'OPENAI_API_KEY', model: 'solo-model'
        });
    }

    @Test('provider command opens the guided wizard and esc cancels it')
    async providerCommandOpensWizard() {
        const appRpc = new AppRpcStub();
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        const pending = (component as any).handleCommand('/provider');
        await waitForCondition(() => !!component.selectMenu);
        expect(component.selectMenu?.title).toEqual('Add provider · choose provider');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual([
            'deepseek', 'openai', 'anthropic', 'gemini', 'custom-openai', 'custom-anthropic', '__cancel__'
        ]);
        await component.sessionState.confirmSelectMenu('__cancel__');
        await pending;
        expect(component.sessionState.providerWizard).toEqual(undefined);
        expect(component.notice).toContain('Add provider cancelled.');
    }

    @Test('yolo command toggles auto approval and persists workspace setting')
    async yoloCommandTogglesAutoApproval() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-yolo-'));
        try {
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            (component as any).settingsStore = store;
            const approval = new ApprovalManagerStub();
            (component as any).approvalManager = approval;
            await component.onInit();

            await (component as any).handleCommand('/yolo on');
            expect((component as any).yoloMode).toEqual(true);
            expect((component as any).options.tools.autoApprove).toEqual(true);
            expect(await store.load(workspace)).toEqual({ yoloMode: true });
            expect(component.notice).toContain('Yolo mode enabled');

            await (component as any).handleCommand('/yolo off');
            expect((component as any).yoloMode).toEqual(false);
            expect((component as any).options.tools.autoApprove).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('approve retry lists rejected actions and retries the selected one')
    async approveRetryRetriesRejectedAction() {
        const appRpc = new AppRpcStub();
        appRpc.rejectedActions = [
            { evidenceId: 'e1', toolName: 'write_file', inputSummary: '{"path":"src/a.ts"}', falsificationReason: 'declared write produced no diff', createdAt: 100 }
        ];
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        const pending = (component as any).handleCommand('/approve retry');
        await waitForCondition(() => !!component.selectMenu);
        expect(component.selectMenu?.title).toEqual('Approve retry');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['e1']);

        await component.sessionState.confirmSelectMenu('e1');
        await pending;

        expect(component.notice).toContain('Retried write_file once');
        expect(appRpc.calls.some(call => call.method === 'harness.retry_rejected_action' && call.params?.evidenceId === 'e1')).toEqual(true);
    }

    @Test('approve retry notifies when there are no rejected actions')
    async approveRetryNotifiesWithoutRejections() {
        const appRpc = new AppRpcStub();
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        await (component as any).handleCommand('/approve retry');
        expect(component.notice).toContain('No auto-review-rejected actions');
    }

    @Test('approve retry without a gateway notifies')
    async approveRetryNotifiesWithoutGateway() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        await (component as any).handleCommand('/approve retry');
        expect(component.notice).toContain('requires a gateway');
    }
}

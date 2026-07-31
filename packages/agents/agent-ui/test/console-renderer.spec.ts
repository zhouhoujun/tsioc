import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleElement, ConsoleRenderer, ConsoleTemplateModule, TuiRenderer, TuiTemplateModule, TuiTerminalSurface } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleApprovalsPanelComponent,
    AgentConsoleComponent,
    AgentConsoleDashboardPanelComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessageDetailPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleReviewPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleJobsPanelComponent,
    AgentConsoleTasksPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent,
    AgentUiModule
} from '../src';

@Suite('Agent Console Renderer')
export class AgentConsoleRendererTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, ConsoleTemplateModule, ComponentsModule]
        });
    }

    @Test('renders agent console through console template module')
    async render() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);
        ref.instance.sessionState.setSessions([
            { id: 'default', current: true, messageCount: 2, updatedAt: 2, workspace: '/tmp/workspace-a' } as any,
            { id: 'chat-2', current: false, messageCount: 1, updatedAt: 1, workspace: '/tmp/workspace-b' } as any
        ]);
        ref.instance.sessionState.setTasksCount(1);
        ref.instance.sessionState.setTokenUsage({
            promptTokens: 120,
            completionTokens: 1080,
            totalTokens: 1200
        });
        await ref.render();
        await Promise.resolve();
        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const inputPanel = ref.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
        const lines = renderer.renderToLines(root);
        const sessionsPanel = ref.hostView.query(AgentConsoleSessionsPanelComponent) as ComponentRef<AgentConsoleSessionsPanelComponent>;
        const dashboardPanel = ref.hostView.query(AgentConsoleDashboardPanelComponent) as ComponentRef<AgentConsoleDashboardPanelComponent>;
        const sessionLines = renderer.renderToLines(sessionsPanel.hostView.rootNodes[0]);
        const messageLines = renderer.renderToLines(messagesPanel.hostView.rootNodes[0]);
        const inputLines = renderer.renderToLines(inputPanel.hostView.rootNodes[0]);

        expect(root.tagName).toEqual('div');
        expect(lines.some(line => line.toLowerCase().includes('tsdi-agent'))).toBe(true);
        expect(ref.hostView.query(AgentConsoleStatusPanelComponent)).toBeTruthy();
        expect(dashboardPanel).toBeTruthy();
        expect(lines.some(line => line.toLowerCase().includes('dashboard'))).toBe(true);
        expect(messageLines.some(line => line.includes('›') && line.includes('hello'))).toBe(true);
        expect(messageLines.some(line => line.includes('•') && line.includes('world'))).toBe(true);
        expect(ref.hostView.query(AgentConsoleSessionsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleInputPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleWorkingPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolRunsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleMessagesPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleActivityPanelComponent)).toBeTruthy();
        expect(inputLines.some(line => line.includes('deepseek-v4-flash · 1.2K tokens'))).toBe(true);
    }

    @Test('renders message history before plan panel in root output')
    async renderMessagesBeforePlanPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'design exam system', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: 'Analyzing request', createdAt: 2 } as any
        ]);
        ref.instance.sessionState.setPlanTodos([
            { id: 'p1', content: 'Design architecture', status: 'in_progress' },
            { id: 'p2', content: 'Generate project structure', status: 'pending' }
        ] as any);
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const lines = renderer.renderToLines(root);
        const messageIndex = lines.findIndex(line => line.includes('design exam system'));
        const planIndex = lines.findIndex(line => line.includes('plan 2 · active 2'));

        expect(messageIndex).toBeGreaterThanOrEqual(0);
        expect(planIndex).toBeGreaterThanOrEqual(0);
        expect(messageIndex).toBeLessThan(planIndex);
    }

    @Test('hides completed plan panel from root output')
    async hideCompletedPlanPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'history stays visible', createdAt: 1 } as any
        ]);
        ref.instance.sessionState.setPlanTodos([
            { id: 'p1', content: 'Design architecture', status: 'completed' },
            { id: 'p2', content: 'Generate project structure', status: 'completed' }
        ] as any);
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const lines = renderer.renderToLines(root);

        expect(lines.some(line => line.includes('history stays visible'))).toBe(true);
        expect(lines.some(line => line.includes('plan 2'))).toBe(false);
    }

    @Test('hides dashboard when only completed plan todos remain')
    async hideDashboardWhenOnlyCompletedPlanTodosRemain() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setPlanTodos([
            { id: 'p1', content: 'Design architecture', status: 'completed' },
            { id: 'p2', content: 'Generate project structure', status: 'completed' }
        ] as any);
        await ref.render();
        await Promise.resolve();

        const dashboardPanel = ref.hostView.query(AgentConsoleDashboardPanelComponent) as ComponentRef<AgentConsoleDashboardPanelComponent>;
        expect(ref.instance.showDashboardPanel).toBe(false);
        expect(dashboardPanel.instance.shouldShow).toBe(false);
    }

    @Test('dashboard shows coding task counters when no plan todos exist')
    async dashboardShowsCodingTaskCountersWithoutPlanTodos() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setReviewTasks([{
            id: 'task-1',
            title: 'Patch handlers',
            sourceSessionId: 'chat-a',
            status: 'running',
            updatedAt: 20
        } as any, {
            id: 'task-2',
            title: 'Review diff',
            sourceSessionId: 'chat-b',
            status: 'completed',
            updatedAt: 10
        } as any]);
        await ref.render();
        await Promise.resolve();

        const dashboardPanel = ref.hostView.query(AgentConsoleDashboardPanelComponent) as ComponentRef<AgentConsoleDashboardPanelComponent>;
        expect(dashboardPanel.instance.shouldShow).toBe(true);
        expect(dashboardPanel.instance.dashboardCountersLabel.includes('tasks 1/2')).toBe(true);
        expect(dashboardPanel.instance.dashboardDetailLabel.includes('task task-1 · Patch handlers · running')).toBe(true);
    }

    @Test('dashboard shows tool run stats with success rate and average duration')
    async dashboardShowsToolRunStats() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setStatus('running');
        ref.instance.sessionState.upsertToolRun({
            name: 'read_file', status: 'success', durationMs: 100, message: 'ok', updatedAt: 1
        });
        ref.instance.sessionState.upsertToolRun({
            name: 'write_file', status: 'error', durationMs: 300, message: 'denied', error: 'denied', updatedAt: 2
        });
        ref.instance.sessionState.upsertToolRun({
            name: 'search', status: 'success', durationMs: 200, message: 'found', updatedAt: 3
        });
        ref.instance.sessionState.upsertToolRun({
            name: 'terminal', status: 'running', message: 'npm test', updatedAt: 4
        });
        await ref.render();
        await Promise.resolve();

        const dashboardPanel = ref.hostView.query(AgentConsoleDashboardPanelComponent) as ComponentRef<AgentConsoleDashboardPanelComponent>;
        const stats = dashboardPanel.instance.dashboardStatsLabel;

        expect(stats.includes('runs 4')).toBe(true);
        expect(stats.includes('ok 2')).toBe(true);
        expect(stats.includes('fail 1')).toBe(true);
        expect(stats.includes('running 1')).toBe(true);
        expect(stats.includes('success 67%')).toBe(true);
        expect(stats.includes('avg 200ms')).toBe(true);
    }

    @Test('dashboard omits tool run stats when no runs exist')
    async dashboardOmitsToolRunStatsWithoutRuns() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.clearToolActivity();
        ref.instance.sessionState.setStatus('running');
        await ref.render();
        await Promise.resolve();

        const dashboardPanel = ref.hostView.query(AgentConsoleDashboardPanelComponent) as ComponentRef<AgentConsoleDashboardPanelComponent>;
        expect(dashboardPanel.instance.dashboardStatsLabel).toBe('');
    }

    @Test('root output keeps dashboard visible for coding tasks without plan todos')
    async rootOutputKeepsDashboardVisibleForCodingTasksWithoutPlanTodos() {
        const ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
            ref.instance.sessionState.setStatus('idle');
            ref.instance.sessionState.setReviewTasks([{
                id: 'task-1',
                title: 'Patch handlers',
                sourceSessionId: 'chat-a',
                status: 'running',
                updatedAt: 20
            } as any, {
                id: 'task-2',
                title: 'Review diff',
                sourceSessionId: 'chat-b',
                status: 'completed',
                updatedAt: 10
            } as any]);
            await ref.render();
            await Promise.resolve();

            const renderer = ctx.get(ConsoleRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToLines(root);
            expect(lines.some(line => line.toLowerCase().includes('dashboard'))).toBe(true);
            expect(lines.some(line => line.includes('tasks 1/2'))).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('renders message history before jobs panel in root output')
    async renderMessagesBeforeJobsPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'keep chat above jobs', createdAt: 1 } as any
        ]);
        ref.instance.sessionState.setScheduledTasks([{
            id: 'job-1',
            sessionId: 'console',
            prompt: 'run nightly scoring',
            scheduleType: 'once',
            runAt: Date.now() + 1000,
            nextRunAt: Date.now() + 1000,
            runCount: 0,
            failureCount: 0
        } as any]);
        ref.instance.sessionState.setSelectedScheduledTaskId('job-1');
        ref.instance.sessionState.setJobsFocused(true);
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const lines = renderer.renderToLines(root);
        const messageIndex = lines.findIndex(line => line.includes('keep chat above jobs'));
        const jobsIndex = lines.findIndex(line => line.includes('jobs 1'));

        expect(messageIndex).toBeGreaterThanOrEqual(0);
        expect(jobsIndex).toBeGreaterThanOrEqual(0);
        expect(messageIndex).toBeLessThan(jobsIndex);
    }

    @Test('renders shared reply statuses in messages panel')
    async renderMessageStatuses() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            {
                id: 'a1',
                role: 'assistant',
                content: 'streaming response',
                createdAt: 1,
                metadata: { streaming: true }
            } as any,
            {
                id: 'e1',
                role: 'assistant',
                content: 'Error: broken',
                createdAt: 2,
                metadata: { error: true }
            } as any
        ]);
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messageLines = renderer.renderToLines(messagesPanel.hostView.rootNodes[0]);

        expect(messageLines.some(line => line.includes('•') && line.includes('streaming response'))).toBe(true);
        expect(messageLines.some(line => line.includes('!') && line.includes('Error: broken'))).toBe(true);
    }

    @Test('truncates oversized unfocused messages in messages panel')
    async truncateOversizedUnfocusedMessages() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([{
            id: 'a1',
            role: 'assistant',
            content: Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n'),
            createdAt: 1
        } as any]);
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messageLines = renderer.renderToLines(messagesPanel.hostView.rootNodes[0]);

        expect(messageLines.some(line => line.includes('line 1'))).toBe(true);
        expect(messageLines.some(line => line.includes('… 5 more lines. click to view'))).toBe(true);
        expect(messageLines.some(line => line.includes('line 9'))).toBe(false);
    }

    @Test('keeps the latest substantive user request visible while showing latest messages when unfocused')
    async keepsLatestSubstantiveUserRequestVisibleWhileUnfocused() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setConsoleOptions({ messagesVisibleItems: 4 });
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: '设计一个在线考试系统', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: '第一段方案', createdAt: 2 } as any,
            { id: 'u2', role: 'user', content: '继续', createdAt: 3 } as any,
            { id: 'a2', role: 'assistant', content: '第二段方案', createdAt: 4 } as any,
            { id: 'u3', role: 'user', content: '继续', createdAt: 5 } as any,
            { id: 'a3', role: 'assistant', content: '第三段方案', createdAt: 6 } as any
        ]);
        await ref.render();
        await Promise.resolve();

        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const visibleIds = messagesPanel.instance.visibleMessages.map(message => message.id);

        expect(visibleIds).toEqual(['u1', 'a2', 'u3', 'a3']);
    }

    @Test('replaces the pinned root request when a newer substantive user request appears')
    async replacesPinnedRootRequestWhenNewerSubstantiveUserRequestAppears() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setConsoleOptions({ messagesVisibleItems: 4 });
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: '设计一个在线考试系统', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: '第一段方案', createdAt: 2 } as any,
            { id: 'u2', role: 'user', content: '继续', createdAt: 3 } as any,
            { id: 'a2', role: 'assistant', content: '第二段方案', createdAt: 4 } as any,
            { id: 'u3', role: 'user', content: '补充数据库表设计', createdAt: 5 } as any,
            { id: 'a3', role: 'assistant', content: '第三段方案', createdAt: 6 } as any,
            { id: 'u4', role: 'user', content: '继续', createdAt: 7 } as any,
            { id: 'a4', role: 'assistant', content: '第四段方案', createdAt: 8 } as any,
            { id: 'u5', role: 'user', content: '继续', createdAt: 9 } as any,
            { id: 'a5', role: 'assistant', content: '第五段方案', createdAt: 10 } as any
        ]);
        await ref.render();
        await Promise.resolve();

        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const visibleIds = messagesPanel.instance.visibleMessages.map(message => message.id);

        expect(visibleIds).toEqual(['u3', 'a4', 'u5', 'a5']);
    }

    @Test('renders working line with token usage while running')
    async renderWorkingLine() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setStatus('running');
        ref.instance.sessionState.turnStartedAt = Date.now() - 65000;
        ref.instance.sessionState.setTokenUsage({
            promptTokens: 120,
            completionTokens: 80,
            totalTokens: 200
        });
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const workingPanel = ref.hostView.query(AgentConsoleWorkingPanelComponent) as ComponentRef<AgentConsoleWorkingPanelComponent>;
        const workingLines = renderer.renderToLines(workingPanel.hostView.rootNodes[0]);

        expect(workingLines.some(line => line.includes('Working'))).toBe(true);
        expect(workingLines.some(line => line.includes('wait for reply'))).toBe(true);
        expect(workingLines.some(line => line.includes('200 tokens'))).toBe(true);
    }

    @Test('renders focused tool list with selected tool details')
    async renderFocusedToolList() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setTools([
            { name: 'read_file', toolset: 'filesystem', active: true, activationKind: 'always' } as any,
            { name: 'write_file', toolset: 'filesystem', active: false, activationKind: 'approval' } as any
        ]);
        ref.instance.sessionState.upsertToolRun({
            name: 'write_file',
            status: 'error',
            message: 'Permission denied',
            error: 'Permission denied',
            updatedAt: Date.now()
        });
        ref.instance.sessionState.setToolsFocused(true);
        ref.instance.sessionState.setSelectedToolName('write_file');
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const toolsPanel = ref.hostView.query(AgentConsoleToolsPanelComponent) as ComponentRef<AgentConsoleToolsPanelComponent>;
        const toolLines = renderer.renderToLines(toolsPanel.hostView.rootNodes[0]);

        expect(toolLines.some(line => line.includes('tools 2'))).toBe(true);
        expect(toolLines.some(line => line.includes('› write_file'))).toBe(true);
        expect(toolLines.some(line => line.includes('status inactive'))).toBe(true);
        expect(toolLines.some(line => line.includes('Permission denied'))).toBe(true);
    }

    @Test('renders focused tool runs panel with selected run details')
    async renderFocusedToolRunsPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.clearToolActivity();
        ref.instance.sessionState.setToolRunsFocused(false);
        ref.instance.sessionState.upsertToolRun({
            name: 'read_file', status: 'success', durationMs: 100, message: 'ok', inputSummary: 'read a.ts', outputSummary: 'content', updatedAt: 1
        });
        ref.instance.sessionState.upsertToolRun({
            name: 'terminal', status: 'running', message: 'npm test', inputSummary: 'npm test', updatedAt: 2
        });
        ref.instance.sessionState.setToolRunsFocused(true);
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const runsPanel = ref.hostView.query(AgentConsoleToolRunsPanelComponent) as ComponentRef<AgentConsoleToolRunsPanelComponent>;
        const runLines = renderer.renderToLines(runsPanel.hostView.rootNodes[0]);

        expect(ref.instance.showToolRunsPanel).toBe(true);
        expect(runLines.some(line => line.includes('tool runs 2'))).toBe(true);
        expect(runLines.some(line => line.includes('running 1'))).toBe(true);
        expect(runLines.some(line => line.includes('› terminal'))).toBe(true);
        expect(runLines.some(line => line.includes('terminal [running]'))).toBe(true);
        expect(runLines.some(line => line.includes('in npm test'))).toBe(true);
    }

    @Test('tool runs panel stays hidden until focused')
    async toolRunsPanelHiddenUntilFocused() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.clearToolActivity();
        ref.instance.sessionState.setToolRunsFocused(false);
        ref.instance.sessionState.upsertToolRun({
            name: 'read_file', status: 'success', durationMs: 100, message: 'ok', updatedAt: 1
        });
        await ref.render();

        const runsPanel = ref.hostView.query(AgentConsoleToolRunsPanelComponent) as ComponentRef<AgentConsoleToolRunsPanelComponent>;

        expect(ref.instance.showToolRunsPanel).toBe(false);
        expect(runsPanel.instance.toolRunsSummaryLabel.includes('tool runs 1')).toBe(true);

        ref.instance.sessionState.setToolRunsFocused(true);
        expect(ref.instance.showToolRunsPanel).toBe(true);
    }

    @Test('renders focused approval list with selected request details')
    async renderFocusedApprovalList() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setPendingApprovals([
            {
                id: 'approval-1',
                toolName: 'write_file',
                sessionId: 'console',
                reason: 'Writing files requires approval.',
                summary: 'Writing files requires approval.',
                hasInput: true,
                inputSummary: '{"path":"notes.txt"}',
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
                inputSummary: 'npm test',
                createdAt: 2,
                timeoutMs: 60000
            } as any
        ]);
        ref.instance.sessionState.setApprovalsFocused(true);
        ref.instance.sessionState.setSelectedApprovalId('approval-2');
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const approvalsPanel = ref.hostView.query(AgentConsoleApprovalsPanelComponent) as ComponentRef<AgentConsoleApprovalsPanelComponent>;
        const approvalLines = renderer.renderToLines(approvalsPanel.hostView.rootNodes[0]);

        expect(approvalLines.some(line => line.includes('approvals 2'))).toBe(true);
        expect(approvalLines.some(line => line.includes('› terminal (approval)'))).toBe(true);
        expect(approvalLines.some(line => line.includes('Shell execution requires approval.'))).toBe(true);
        expect(approvalLines.some(line => line.includes('npm test'))).toBe(true);
    }

    @Test('renders expanded message content inline without a dedicated detail panel')
    async renderMessageDetailPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: '\tline1\n\tline2\n\tline3\n\tline4\n\tline5\n\tline6\n\tline7', createdAt: 1 } as any
        ]);
        ref.instance.sessionState.setMessagesFocused(true);
        ref.instance.sessionState.openMessageDetail();
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const detailPanel = ref.hostView.query(AgentConsoleMessageDetailPanelComponent) as ComponentRef<AgentConsoleMessageDetailPanelComponent> | null;
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messageLines = renderer.renderToLines(messagesPanel.hostView.rootNodes[0]);

        expect(detailPanel).toBeFalsy();
        expect(messageLines.some(line => line.includes('line1'))).toBe(true);
        expect(messageLines.some(line => line.includes('line7'))).toBe(true);
        expect(messageLines.some(line => line.includes('more lines'))).toBe(false);
    }

    @Test('renders coding task review panel with diff and worker details')
    async renderCodingTaskReviewPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setReviewTasks([{
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
        ref.instance.sessionState.setSelectedReviewTaskId('task-1');
        ref.instance.sessionState.openReview({
            id: 'task-1',
            title: 'Patch handlers',
            status: 'completed',
            result: {
                rollback: {
                    available: true,
                    checkpointId: 'checkpoint-task-1',
                    mode: 'parallel_worktree'
                }
            },
            metadata: {
                executionMode: 'parallel',
                retryOfTaskId: 'task-0',
                retrySourceTaskId: 'task-0',
                retrySequence: 1,
                checkpoints: [{
                    id: 'checkpoint-task-1',
                    status: 'available'
                }]
            }
        }, {
            executionMode: 'parallel',
            diff: {
                summary: '1 worker diff(s) captured',
                text: [
                    'diff --git a/src/a.ts b/src/a.ts',
                    '+new line',
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
                    text: 'diff --git a/src/a.ts b/src/a.ts\n+new line'
                }
            }]
        });
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const reviewPanel = ref.hostView.query(AgentConsoleReviewPanelComponent) as ComponentRef<AgentConsoleReviewPanelComponent>;
        const reviewLines = renderer.renderToLines(reviewPanel.hostView.rootNodes[0]);

        expect(reviewLines.some(line => line.includes('task-1'))).toBe(true);
        expect(reviewLines.some(line => line.includes('Patch handlers'))).toBe(true);
        expect(reviewLines.some(line => line.includes('status completed · mode parallel · workers 1 · groups 2 · files 2 · rollback available'))).toBe(true);
        expect(reviewLines.some(line => line.includes('completed'))).toBe(true);
        expect(reviewLines.some(line => line.includes('parallel'))).toBe(true);
        expect(reviewLines.some(line => line.includes('lineage 2/2 root task-0'))).toBe(true);
        expect(reviewLines.some(line => line.includes('1 worker diff'))).toBe(true);
        expect(reviewLines.some(line => line.includes('group 1/2 aggregate'))).toBe(true);
        expect(reviewLines.some(line => line.includes('Review: ready · rollback available · lineage 2/2'))).toBe(true);
        expect(reviewLines.some(line => line.includes('Scope: 2 files changed · 1 worker · lineage 2 tasks'))).toBe(true);
        expect(reviewLines.some(line => line.includes('Rollback: available'))).toBe(true);
        expect(reviewLines.some(line => line.includes('Checkpoints: 1 total'))).toBe(true);
        expect(reviewLines.some(line => line.includes('Groups: 2'))).toBe(true);
        expect(reviewLines.some(line => line.includes('› [1/2] aggregate · aggregate'))).toBe(true);
        expect(reviewLines.some(line => line.includes('[2/2] worker-1 · worker'))).toBe(true);
        expect(reviewLines.some(line => line.includes('diff --git a/src/b.ts b/src/b.ts'))).toBe(false);
    }

    @Test('renders coding task inspector panel with task summary')
    async renderCodingTaskInspectorPanel() {
        const ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
            ref.instance.sessionState.setTaskRecords([{
                id: 'task-0',
                sourceSessionId: 'chat-b',
                title: 'Initial patch',
                status: 'failed',
                result: {
                    executionMode: 'parallel',
                    workers: [{ workerId: 'worker-1' }, { workerId: 'worker-2' }],
                    aggregate: {
                        totalWorkers: 2,
                        completedWorkers: 1,
                        failedWorkers: 1,
                        status: 'partial_failure'
                    },
                    rollback: {
                        available: true
                    }
                },
                metadata: {
                    executionMode: 'parallel',
                    checkpoints: [{ id: 'checkpoint-task-0', status: 'available' }]
                },
                planning: {
                    summary: 'Initial patch summary'
                },
                goal: 'Initial patch goal',
                actions: [
                    { title: 'Edit initial handlers', status: 'completed', tool: 'edit_file', workerId: 'worker-1' },
                    { title: 'Retry beta path', status: 'failed', tool: 'edit_file', workerId: 'worker-2' }
                ]
            } as any, {
                id: 'task-1',
                sourceSessionId: 'chat-b',
                title: 'Patch handlers',
                status: 'completed',
                result: {
                    executionMode: 'parallel',
                    workers: [{ workerId: 'worker-1' }],
                    aggregate: {
                        totalWorkers: 1,
                        completedWorkers: 1,
                        failedWorkers: 0,
                        status: 'completed'
                    },
                    rollback: {
                        available: true
                    }
                },
                metadata: {
                    executionMode: 'parallel',
                    retryOfTaskId: 'task-0',
                    retrySequence: 1,
                    retryOfWorkerIds: ['worker-2'],
                    carryForwardWorkerIds: ['worker-1'],
                    checkpoints: [{ id: 'checkpoint-task-1', status: 'available' }]
                },
                planning: {
                    summary: 'Patch handlers summary'
                },
                goal: 'Patch handlers goal',
                actions: [
                    { title: 'Edit handlers', status: 'completed', tool: 'edit_file', workerId: 'worker-1' },
                    { title: 'Review diff', status: 'completed', tool: 'git_operations' }
                ]
            } as any]);
            ref.instance.sessionState.setProjectContext({
                projectLabel: 'exam-system',
                projectSummary: 'latest project summary',
                projectSessionCount: 2
            });
            ref.instance.sessionState.setReviewTasks([{
                id: 'task-0',
                title: 'Initial patch',
                sourceSessionId: 'chat-b',
                status: 'failed',
                executionMode: 'parallel',
                lineageTaskCount: 2,
                workerCount: 2,
                rollbackAvailable: true,
                checkpointSummary: '1 total · 1 available · 0 applied · 0 invalidated'
            } as any, {
                id: 'task-1',
                title: 'Patch handlers',
                sourceSessionId: 'chat-b',
                status: 'completed',
                executionMode: 'parallel',
                retryOfTaskId: 'task-0',
                retryDepth: 1,
                lineageTaskCount: 2,
                workerCount: 1,
                rollbackAvailable: true,
                checkpointSummary: '1 total · 1 available · 0 applied · 0 invalidated'
            } as any]);
            ref.instance.sessionState.setSelectedReviewTaskId('task-1');
            ref.instance.sessionState.setTasksFocused(true);
            await ref.render();
            await Promise.resolve();

            const tasksPanel = ref.hostView.query(AgentConsoleTasksPanelComponent) as ComponentRef<AgentConsoleTasksPanelComponent>;
            expect(tasksPanel.instance.tasksSummaryLabel.includes('tasks 2')).toBe(true);
            expect(tasksPanel.instance.taskListLabel.includes('task-0 · Initial patch')).toBe(true);
            expect(tasksPanel.instance.taskListLabel.includes('Patch handlers')).toBe(true);
            expect(tasksPanel.instance.taskListLabel.includes('retry 1')).toBe(true);
            expect(tasksPanel.instance.taskListLabel.includes('from task-0')).toBe(true);
            expect(tasksPanel.instance.taskListLabel.includes('lineage 2')).toBe(true);
            expect(tasksPanel.instance.taskListLabel.includes('  - task-1 · Patch handlers')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('summary latest project summary')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('session chat-b')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('worker status completed')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('retry depth 1')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('lineage tasks 2')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('retry task-0')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('retry workers worker-2')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('carry forward worker-1')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('rollback available')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('checkpoints 1 total')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('1.')).toBe(true);
            expect(tasksPanel.instance.selectedTaskDetailLabel.includes('Edit handlers')).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('tasks panel falls back to coding tasks when plan todos are completed')
    async tasksPanelFallsBackToCodingTasksWhenPlanIsCompleted() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setPlanTodos([
            { id: 'p1', content: 'Design architecture', status: 'completed' },
            { id: 'p2', content: 'Generate project structure', status: 'completed' }
        ] as any);
        ref.instance.sessionState.setReviewTasks([{
            id: 'task-1',
            title: 'Patch handlers',
            sourceSessionId: 'chat-a',
            status: 'running',
            updatedAt: 20
        } as any]);
        ref.instance.sessionState.setSelectedReviewTaskId('task-1');
        ref.instance.sessionState.setTasksFocused(true);
        await ref.render();
        await Promise.resolve();

        const tasksPanel = ref.hostView.query(AgentConsoleTasksPanelComponent) as ComponentRef<AgentConsoleTasksPanelComponent>;
        expect(tasksPanel.instance.tasksSummaryLabel.includes('plan 2')).toBe(false);
        expect(tasksPanel.instance.tasksSummaryLabel.includes('tasks 1/1')).toBe(true);
        expect(tasksPanel.instance.taskListLabel.includes('Patch handlers')).toBe(true);
        expect(tasksPanel.instance.taskListLabel.includes('Design architecture')).toBe(false);
    }

    @Test('renders scheduled jobs panel with task details')
    async renderScheduledJobsPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setScheduledTasks([{
            id: 'job-1',
            sessionId: 'console',
            prompt: 'later',
            scheduleType: 'once',
            runAt: Date.now() + 1000,
            nextRunAt: Date.now() + 1000,
            runCount: 0,
            failureCount: 0
        } as any]);
        ref.instance.sessionState.setSelectedScheduledTaskId('job-1');
        ref.instance.sessionState.setJobsFocused(true);
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const jobsPanel = ref.hostView.query(AgentConsoleJobsPanelComponent) as ComponentRef<AgentConsoleJobsPanelComponent>;
        const jobLines = renderer.renderToLines(jobsPanel.hostView.rootNodes[0]);

        expect(jobLines.some(line => line.includes('jobs 1'))).toBe(true);
        expect(jobLines.some(line => line.includes('later'))).toBe(true);
        expect(jobLines.some(line => line.includes('pause/resume'))).toBe(true);
        expect(jobLines.some(line => line.includes('session console'))).toBe(true);
    }

    @Test('renders agent console panels when created from module context for tui chat')
    async renderFromModuleContext() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const inputPanel = consoleRef.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
            inputPanel.instance.input = 'hello';
            await Promise.resolve();
            const inputLines = renderer.renderToTuiLines(inputPanel.hostView.rootNodes[0], { width: 36 });

            expect(inputLines.some((line: string) => line.includes('hello'))).toBe(true);
            expect(inputLines.some((line: string) => line.includes('>'))).toBe(true);
            expect(inputLines.some((line: string) => line.includes('\x1b['))).toBe(true);
            expect(consoleRef.hostView.query(AgentConsoleWorkingPanelComponent)).toBeTruthy();
            expect(consoleRef.hostView.query(AgentConsoleStatusPanelComponent)).toBeTruthy();
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders live input content in root tui tree')
    async renderLiveInputInRootTree() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.setInput('hello');
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 60 });
            expect(rootLines.some((line: string) => line.includes('hello'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('wraps markdown message lines in tui messages panel')
    async renderWrappedMarkdownMessageInTui() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const messagesPanel = consoleRef.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;

            consoleRef.instance.sessionState.setMessages([
                {
                    id: 'a1',
                    role: 'assistant',
                    content: `**assistant**\n\`\`\`ts\n${'averylongconversationtoken'.repeat(4)}\n\`\`\``,
                    createdAt: 1
                } as any
            ]);
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const lines = renderer.renderToTuiLines(messagesPanel.hostView.rootNodes[0], { width: 24 });
            const visibleLines = lines
                .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
                .filter(Boolean);

            expect(visibleLines.some((line: string) => line.includes('assistant'))).toBe(true);
            expect(visibleLines.some((line: string) => line.includes('**assistant**'))).toBe(false);
            expect(visibleLines.length).toBeGreaterThan(2);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders user message row in tui messages panel')
    async renderUserMessageInTui() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const messagesPanel = consoleRef.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;

            consoleRef.instance.sessionState.setMessages([
                {
                    id: 'u1',
                    role: 'user',
                    content: 'hello tui',
                    createdAt: 1
                } as any
            ]);
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const lines = renderer.renderToTuiLines(messagesPanel.hostView.rootNodes[0], { width: 24 });
            const visibleLines = lines.map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, ''));
            const userLine = visibleLines.find((line: string) => line.includes('hello tui')) || '';

            expect(userLine).toContain('hello tui');
            expect(lines.some((line: string) => line.includes('\x1b[48;2;27;33;40m'))).toEqual(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('activity panel hides turn activities and renders only visible activity kinds')
    async renderActivityPanelFiltersTurns() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(ConsoleRenderer);
            const activityPanel = consoleRef.hostView.query(AgentConsoleActivityPanelComponent) as ComponentRef<AgentConsoleActivityPanelComponent>;

            consoleRef.instance.sessionState.pushActivity('turn', 'User: hello');
            consoleRef.instance.sessionState.pushActivity('error', 'submit failed');
            await Promise.resolve();

            const lines = renderer.renderToLines(activityPanel.hostView.rootNodes[0]);
            expect(lines.some((line: string) => line.includes('turn:'))).toBe(false);
            expect(lines.some((line: string) => line.includes('error:'))).toBe(true);
            expect(lines.some((line: string) => line.includes('submit failed'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('terminal surface updates working state and input from shared component state')
    async terminalSurfaceUpdatesSharedState() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        const output: string[] = [];
        let surface: TuiTerminalSurface | undefined;
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            surface = new TuiTerminalSurface({
                renderer,
                root: consoleRef.elementRef.nativeElement,
                width: 80,
                output: { write: value => output.push(value) }
            });
            await Promise.resolve();

            consoleRef.instance.sessionState.setStatus('idle');
            consoleRef.instance.sessionState.setInput('hello');
            await Promise.resolve();
            await Promise.resolve();

            expect(surface.lastRenderedLines.some(line => line.includes('Working'))).toBe(false);
            expect(surface.lastRenderedLines.some(line => line.includes('hello'))).toBe(true);
            expect(surface.lastRenderedLines
                .map(line => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
                .some(line => line.includes(consoleRef.instance.sessionState.model))).toBe(true);
            expect(output.join('')).toContain('hello');

            consoleRef.instance.sessionState.setStatus('running');
            await Promise.resolve();
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(surface.lastRenderedLines
                .map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))
                .some(line => line.includes('Working'))).toBe(true);
        } finally {
            surface?.destroy();
            await tuiCtx.close();
        }
    }

    @Test('renders the latest visible message content without a stable tail region')
    async rendersLatestVisibleMessageWithoutStableTailRegion() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const messagesPanel = consoleRef.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;

            consoleRef.instance.sessionState.setMessages([
                { id: 'u1', role: 'user', content: 'keep-me', createdAt: 1 } as any,
                { id: 'a1', role: 'assistant', content: 'grow', createdAt: 2 } as any
            ]);
            await Promise.resolve();
            await Promise.resolve();

            const layout = renderer.renderToTuiLayout(messagesPanel.hostView.rootNodes[0], { width: 80 });
            const tailRegion = layout.regions.find(region => region.id === 'message-tail');
            expect(tailRegion).toBeUndefined();
            const rendered = layout.lines
                .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, ''))
                .join('\n');
            expect(rendered).toContain('grow');
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders select menu in root tui tree when session state opens suggestions')
    async renderSelectMenuInRootTree() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.openSelectMenu('Suggestions', [
                {
                    label: '/help',
                    value: '/help',
                    description: 'Commands',
                    detail: {
                        command: '/help',
                        title: 'Help',
                        summary: 'Show available commands and mention shortcuts.'
                    }
                },
                {
                    label: '/tools',
                    value: '/tools',
                    description: 'Commands',
                    detail: {
                        command: '/tools',
                        title: 'Tools',
                        summary: 'Inspect the currently enabled tools for this session.'
                    }
                }
            ], 0, 'tab/enter accept');
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('/help'))).toBe(true);
            expect(rootLines.some((line: string) => /\/help\s{2,}Commands/.test(line))).toBe(true);
            expect(rootLines.some((line: string) => line.includes('Suggestions'))).toBe(false);
            expect(rootLines.some((line: string) => line.includes('Preview'))).toBe(false);
            expect(rootLines.some((line: string) => line.includes('"command": "/help"'))).toBe(false);
            expect(rootLines.some((line: string) => /[┌┐└┘]/.test(line))).toBe(false);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders selected select-menu option beyond the first page')
    async renderScrolledSelectMenuWindow() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.openSelectMenu('Many options', Array.from({ length: 16 }, (_value, index) => ({
                label: `Option ${index + 1}`,
                value: `option-${index + 1}`
            })), 12, 'up/down move');
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('› 13. Option 13'))).toBe(true);
            expect(rootLines.some((line: string) => line.includes('16. Option 16'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('updates select menu selection without rerendering root tree')
    async updateSelectMenuSelectionWithoutRootRender() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.openSelectMenu('Choices', [
                { label: 'First', value: 'first' },
                { label: 'Second', value: 'second' }
            ], 0);
            await Promise.resolve();
            let rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('› 1. First'))).toBe(true);

            consoleRef.instance.sessionState.setSelectMenuIndex(1);
            rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('› 2. Second'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders focused session selection beyond the first page')
    async renderScrolledSessionWindow() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setSessions(Array.from({ length: 10 }, (_value, index) => ({
            id: `chat-${index + 1}`,
            current: index === 0,
            messageCount: index + 1,
            updatedAt: index + 1,
            workspace: '/tmp/project-a',
            projectKey: 'project:exam-system',
            projectId: 'exam-system',
            projectLabel: 'exam-system',
            projectSessionCount: 10
        })) as any);
        ref.instance.sessionState.setSessionsFocused(true);
        ref.instance.sessionState.setSelectedSessionId('chat-9');
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const sessionsPanel = ref.hostView.query(AgentConsoleSessionsPanelComponent) as ComponentRef<AgentConsoleSessionsPanelComponent>;
        const sessionLines = renderer.renderToLines(sessionsPanel.hostView.rootNodes[0]);

        expect(sessionLines.some(line => line.includes('sessions 10 · 9/10'))).toBe(true);
        expect(sessionLines.some(line => line.includes('project exam-system · 10 sessions'))).toBe(true);
        expect(sessionLines.some(line => line.includes('› [project-a] chat-9'))).toBe(true);
        expect(sessionLines.some(line => line.includes('[project-a] chat-10'))).toBe(true);
        expect(sessionLines.some(line => line.includes('[project-a] chat-8'))).toBe(true);
        expect(sessionLines.some(line => line.includes('chat-2'))).toBe(false);
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}

import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, renderAgentConsoleMessageItems } from '../src';
import { formatTimelineEventLine, presentTimelineToolEvent } from '../src/AgentConsoleTimelineEventPresenter';

/**
 * Real TUI finding (sleep-mlt simulation): with an English locale the plan
 * header still rendered `计划已完成：3/4 步，1 个失败` while tool rows were
 * English, and the cancelled step was reported as a failure.
 */
@Suite('plan summary keeps locale defaults and never counts cancelled as failed')
export class PlanSummaryLocaleTest {
    @Test('host console options keep the locale-selected labels')
    async localeDefaultsSurviveSetConsoleOptions() {
        const translator = { currentLocale: 'en', translate: () => undefined } as any;
        const state = new AgentConsoleSessionState(undefined, translator);
        // The component applies `options.ui.console` during construction.
        state.setConsoleOptions({ messageLayout: 'viewport' });
        expect(state.consoleOptions.timelineLabels?.planCompleted).toContain('Plan completed');
        expect(state.consoleOptions.messageStatusLabels?.success).not.toEqual('成功');
    }

    @Test('a cancelled step is reported as cancelled, not failed')
    async cancelledStepIsNotAFailure() {
        const state = new AgentConsoleSessionState();
        state.setPlanTodos([
            { id: 'p1', content: 'Inspect layout', status: 'completed' },
            { id: 'p2', content: 'Run the tests', status: 'completed' },
            { id: 'p3', content: 'Report results', status: 'completed' },
            { id: 'p4', content: 'Fix failures', status: 'cancelled' }
        ] as any);
        const plan = state.displayMessages.find(message => message.id === '__plan_todo_inline__');
        expect(plan).toBeDefined();
        expect(plan!.content).toContain('# 待办');
        expect(plan!.content).toContain('[✓] Inspect layout');
        expect(plan!.content).toContain('[-] Fix failures');
    }

    @Test('failed steps still report failures')
    async failedStepKeepsFailureSegment() {
        const state = new AgentConsoleSessionState();
        state.setPlanTodos([
            { id: 'p1', content: 'Run the tests', status: 'completed' },
            { id: 'p2', content: 'Fix failures', status: 'failed' }
        ] as any);
        const plan = state.displayMessages.find(message => message.id === '__plan_todo_inline__');
        expect(plan!.content).toContain('# 待办');
        expect(plan!.content).toContain('[✓] Run the tests');
        expect(plan!.content).toContain('[✗] Fix failures');
        expect(plan!.content).not.toContain('[-]');
    }
}

/**
 * Real session finding: the plan row printed the requested delta and the
 * resulting counts side by side (`2 items · 1 in progress · 1 completed ·
 * 3 items · …`). The row must show the resulting plan state once.
 */
@Suite('plan tool row shows the resulting plan state once')
export class PlanToolRowPresentationTest {
    @Test('input delta is dropped when the result summary is present')
    async planRowShowsResultOnly() {
        const presentation = presentTimelineToolEvent({
            toolName: 'todo',
            inputSummary: '2 items · 1 in progress · 1 completed',
            outputSummary: '3 items · 1 pending · 1 in progress · 1 completed'
        });
        expect(presentation.target).toEqual('');
        expect(formatTimelineEventLine(presentation)).toContain('3 items · 1 pending · 1 in progress · 1 completed');
        expect(formatTimelineEventLine(presentation)).not.toContain('2 items');
    }

    @Test('a failed plan call still shows the requested items')
    async planRowFallsBackToInput() {
        const presentation = presentTimelineToolEvent({
            toolName: 'todo',
            inputSummary: '2 items · 1 in progress · 1 completed'
        });
        expect(presentation.target).toEqual('2 items · 1 in progress · 1 completed');
    }
}

/**
 * Real zh TUI finding: the session state was constructed before the i18n
 * module configured its locale, so labels stayed English (`Cancelled · Turn
 * cancelled`) while the bundle rendered Chinese (`处理中`). The locale must be
 * re-applied once the session boots, and host-provided options must win.
 */
@Suite('console labels follow the locale resolved after construction')
export class ConsoleLocaleReapplyTest {
    @Test('configure() re-applies the resolved locale to labels and hints')
    async configureReappliesLocale() {
        const translator: any = { currentLocale: 'en', translate: () => undefined };
        const state = new AgentConsoleSessionState(undefined, translator);
        expect(state.consoleOptions.timelineLabels?.planCompleted).toContain('Plan completed');
        // The i18n module resolves zh after the state exists.
        translator.currentLocale = 'zh-CN';
        state.configure({ sessionId: 'session-zh' } as any);
        expect(state.consoleOptions.timelineLabels?.planCompleted).toContain('计划已完成');
        expect(state.consoleOptions.inputPlaceholder).toEqual('问我代码或文件');
        expect(state.consoleOptions.messageStatusLabels?.success).toEqual('成功');
    }

    @Test('host-provided options are never overwritten by locale defaults')
    async hostOptionsWin() {
        const translator: any = { currentLocale: 'zh-CN', translate: () => undefined };
        const state = new AgentConsoleSessionState(undefined, translator);
        state.setConsoleOptions({ timelineLabels: { planCompleted: 'Custom {completed}/{total}' } as any });
        translator.currentLocale = 'en';
        state.applyLocaleDefaults('en');
        expect(state.consoleOptions.timelineLabels?.planCompleted).toEqual('Custom {completed}/{total}');
        expect(state.consoleOptions.messageStatusLabels?.success).toEqual('Success');
    }
}

/**
 * Real zh TUI finding: cancelling a turn rendered `Turn cancelled` verbatim
 * (the bridge's boilerplate content) while the rest of the row was localized.
 * The catalog label must win for that boilerplate, without hiding a custom
 * cancellation reason.
 */
@Suite('cancelled turn rows follow the locale')
export class CancelledTurnLocaleTest {
    protected rowText(state: any, content: string, eventType = 'turn_cancelled'): string {
        state.upsertUiEventMessage('turn-cancel', content, { eventType, label: 'state', status: 'cancelled' } as any);
        const items = renderAgentConsoleMessageItems(state.messages, {
            timelineLabels: state.consoleOptions.timelineLabels
        });
        return items.map(item => item.lines.map((line: any) => String(line.content || '')).join(' ')).join(' ');
    }

    @Test('the boilerplate cancellation text follows the locale')
    async boilerplateIsLocalized() {
        const translator: any = { currentLocale: 'zh-CN', translate: () => undefined };
        const state = new AgentConsoleSessionState(undefined, translator);
        state.configure({ sessionId: 'cancel-zh' } as any);
        expect(this.rowText(state, 'Turn cancelled')).toContain('轮次已取消');
    }

    @Test('a custom cancellation reason is preserved')
    async customReasonStays() {
        const translator: any = { currentLocale: 'zh-CN', translate: () => undefined };
        const state = new AgentConsoleSessionState(undefined, translator);
        state.configure({ sessionId: 'cancel-custom' } as any);
        expect(this.rowText(state, 'Stopped by user')).toContain('Stopped by user');
    }

    @Test('turn completion and request-start boilerplate follow the locale')
    async turnLifecycleBoilerplateIsLocalized() {
        const translator: any = { currentLocale: 'zh-CN', translate: () => undefined };
        const completed = new AgentConsoleSessionState(undefined, translator);
        completed.configure({ sessionId: 'complete-zh' } as any);
        expect(this.rowText(completed, 'Turn completed', 'turn_completed')).toContain('轮次已完成');
        expect(this.rowText(completed, 'Turn completed', 'turn_completed')).not.toContain('Turn completed');

        const started = new AgentConsoleSessionState(undefined, translator);
        started.configure({ sessionId: 'start-zh' } as any);
        expect(this.rowText(started, 'Analyzing request', 'turn_started')).toContain('已收到请求');
    }
}

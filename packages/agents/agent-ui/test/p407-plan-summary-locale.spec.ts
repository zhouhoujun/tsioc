import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
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
        const plan = state.displayMessages.find(message => String(message.content || '').includes('计划已完成'));
        expect(plan).toBeDefined();
        expect(plan!.content).toContain('3/4');
        expect(plan!.content).not.toContain('个失败');
        expect(plan!.content).toContain('已取消');
    }

    @Test('failed steps still report failures')
    async failedStepKeepsFailureSegment() {
        const state = new AgentConsoleSessionState();
        state.setPlanTodos([
            { id: 'p1', content: 'Run the tests', status: 'completed' },
            { id: 'p2', content: 'Fix failures', status: 'failed' }
        ] as any);
        const plan = state.displayMessages.find(message => String(message.content || '').includes('计划已完成'));
        expect(plan!.content).toContain('1 个失败');
        expect(plan!.content).not.toContain('已取消');
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

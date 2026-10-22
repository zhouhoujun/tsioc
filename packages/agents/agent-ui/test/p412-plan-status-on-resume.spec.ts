import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, resolveAgentConsoleMessageStatus } from '../src';

/**
 * Real TUI finding: a plan left running when the session ended still rendered
 * as `Plan · Running …` after a restart, although no turn is running. The plan
 * row must only claim "running" while a turn actually is.
 */
@Suite('resumed plan status')
export class ResumedPlanStatusTest {
    protected plan(): any {
        return {
            id: '__plan_todo_inline__',
            role: 'assistant',
            content: 'Plan 12 steps (0 done)',
            createdAt: 1,
            metadata: {
                uiKind: 'plan-todo',
                planItems: [
                    { id: 'p1', content: 'Inspect', status: 'in_progress' },
                    { id: 'p2', content: 'Implement', status: 'pending' }
                ]
            }
        };
    }

    @Test('an idle session does not report a running plan')
    async idlePlanIsNotRunning() {
        const state = new AgentConsoleSessionState();
        state.setPlanTodos([
            { id: 'p1', content: 'Inspect', status: 'in_progress' },
            { id: 'p2', content: 'Implement', status: 'pending' }
        ] as any);
        const plan = state.displayMessages.find(message => message.id === '__plan_todo_inline__') as any;
        expect(plan).toBeDefined();
        expect(resolveAgentConsoleMessageStatus(plan)).toBeUndefined();
    }

    @Test('a running turn still reports the plan as running')
    async runningPlanStaysRunning() {
        const state = new AgentConsoleSessionState();
        state.setStatus('running');
        state.setPlanTodos([
            { id: 'p1', content: 'Inspect', status: 'in_progress' },
            { id: 'p2', content: 'Implement', status: 'pending' }
        ] as any);
        const plan = state.displayMessages.find(message => message.id === '__plan_todo_inline__') as any;
        expect(resolveAgentConsoleMessageStatus(plan)).toEqual('running');
    }

    @Test('the collapsed plan summary follows the locale')
    async collapsedSummaryIsLocalized() {
        // Mirrors the bundle: the translator interpolates the template.
        const translator: any = {
            currentLocale: 'zh-CN',
            translate: (key: string, params: any) => key === 'agent.timeline.planSummary'
                ? `${params?.total} 步（已完成 ${params?.completed} 步）`
                : undefined
        };
        const state = new AgentConsoleSessionState(undefined, translator);
        const todos = Array.from({ length: 12 }, (_value, index) => ({ id: `p${index}`, content: `Step ${index}`, status: 'pending' }));
        state.setPlanTodos(todos as any);
        const plan = state.displayMessages.find(message => message.id === '__plan_todo_inline__') as any;
        expect(String(plan.content)).toContain('12 步（已完成 0 步）');
        expect(String(plan.content)).not.toContain('steps (');
    }
}

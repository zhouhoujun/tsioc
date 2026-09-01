import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

function eventMsg(id: string, overrides: Record<string, any> = {}): any {
    return {
        id,
        role: 'assistant',
        content: 'event content',
        createdAt: Date.now(),
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            uiEventLabel: 'tool',
            uiEventKey: `scope:read:${id}`,
            status: 'success',
            durationMs: 100,
            ...overrides
        }
    };
}

function structuralMsg(id: string): any {
    return {
        id,
        role: 'assistant',
        content: 'step 1',
        createdAt: Date.now(),
        metadata: { uiKind: 'plan-todo' }
    };
}

function errorMsg(id: string): any {
    return eventMsg(id, { status: 'error', uiEventType: 'tool_failed' });
}

@Suite('timeline view mode (P223)')
export class TimelineViewModeTest {

    @Test('default timelineViewMode is off')
    testDefaultOff() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.timelineViewMode).toBe('off');
        expect(state.timelineMode).toBe(false);
    }

    @Test('setTimelineMode(true) sets compact')
    testSetTrue() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setTimelineMode(true);
        expect(state.timelineViewMode).toBe('compact');
        expect(state.timelineMode).toBe(true);
    }

    @Test('setTimelineMode(false) sets off')
    testSetFalse() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setTimelineMode(false);
        expect(state.timelineViewMode).toBe('off');
        expect(state.timelineMode).toBe(false);
    }

    @Test('setTimelineMode accepts string modes')
    testSetString() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setTimelineMode('compact');
        expect(state.timelineViewMode).toBe('compact');
        expect(state.timelineMode).toBe(true);

        state.setTimelineMode('steps');
        expect(state.timelineViewMode).toBe('steps');
        expect(state.timelineMode).toBe(true);

        state.setTimelineMode('verbose');
        expect(state.timelineViewMode).toBe('verbose');
        expect(state.timelineMode).toBe(true);

        state.setTimelineMode('off');
        expect(state.timelineViewMode).toBe('off');
        expect(state.timelineMode).toBe(false);
    }

    @Test('timelineMode computed getter is true for compact/steps/verbose')
    testComputedGetter() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        for (const mode of ['compact', 'steps', 'verbose'] as const) {
            state.setTimelineMode(mode);
            expect(state.timelineMode).toBe(true);
            expect(state.timelineViewMode).toBe(mode);
        }
        state.setTimelineMode('off');
        expect(state.timelineMode).toBe(false);
    }
}

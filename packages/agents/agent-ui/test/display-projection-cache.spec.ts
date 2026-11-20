import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { resolveDisplayMessages } from '../src/AgentConsoleMessageProjection';

const msg = (id: string, role: 'user' | 'assistant', content: string, createdAt = 1): any =>
    ({ id, role, content, createdAt });

@Suite('display projection cache')
export class DisplayProjectionCacheTest {
    @Test('returning to a previously projected transcript reuses its result')
    reusesPerTranscript() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const a = [msg('a1', 'user', 'first question'), msg('a2', 'assistant', 'first answer', 2)];
        const b = [msg('b1', 'user', 'second question'), msg('b2', 'assistant', 'second answer', 2)];
        state.messages = a as any;
        const first = resolveDisplayMessages(state);
        state.messages = b as any;
        resolveDisplayMessages(state);
        state.messages = a as any;
        expect(resolveDisplayMessages(state)).toBe(first);
    }

    @Test('plan changes invalidate the per-transcript projection')
    invalidatesOnPlanChange() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const a = [msg('a1', 'user', 'question'), msg('a2', 'assistant', 'answer', 2)];
        state.messages = a as any;
        const first = resolveDisplayMessages(state);
        state.setPlanTodos([{ id: 'p1', content: 'do it', status: 'pending' } as any]);
        expect(resolveDisplayMessages(state)).not.toBe(first);
    }
}

import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';

const message = (id: string, content: string, createdAt = 1): any =>
    ({ id, role: 'assistant', content, createdAt });

@Suite('agent console transcript projection')
export class AgentConsoleTranscriptProjectionTest {
    @Test('sanitizes synthetic role-marker transcripts on the first set')
    dropsSyntheticRows() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            message('a', 'hello'),
            message('synthetic', 'user: one | assistant: two | tool: three', 2)
        ] as any);
        expect(state.messages.map(item => item.id)).toEqual(['a']);
    }

    @Test('re-applying a projected transcript keeps its array identity')
    reusesProjectedArray() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([message('a', 'hello'), message('b', 'world', 2)] as any);
        const projected = state.messages;
        expect(projected.map(item => item.id)).toEqual(['a', 'b']);
        // Tab switches apply a cached snapshot: re-filtering it scans every
        // message and breaks the identity fast path in the item cache.
        state.setMessages(projected as any);
        expect(state.messages).toBe(projected);
        expect(state.messages.map(item => item.id)).toEqual(['a', 'b']);
    }

    @Test('a fresh runtime array is still sanitized')
    sanitizesEveryNewArray() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([message('a', 'hello')] as any);
        state.setMessages([message('b', 'ok'), message('synthetic', 'user: x | tool: y', 2)] as any);
        expect(state.messages.map(item => item.id)).toEqual(['b']);
    }
}

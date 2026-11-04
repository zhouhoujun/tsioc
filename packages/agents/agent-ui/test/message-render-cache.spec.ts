import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import {
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSessionState
} from '../src';

@Suite('message projection caches')
export class MessageProjectionCacheTest {
    protected state(): AgentConsoleSessionState {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'u1', role: 'user', content: 'question', createdAt: 1 },
            { id: 't1', role: 'assistant', content: 'thinking one\nthinking two', createdAt: 2, metadata: { uiEventType: 'reasoning' } },
            { id: 'x1', role: 'tool', content: 'tool output', createdAt: 3, metadata: { type: 'shell' } },
            { id: 'a1', role: 'assistant', content: 'answer', createdAt: 4 }
        ] as any);
        return state;
    }

    @Test('display projection is stable until the transcript or its inputs change')
    displayProjectionIsStable() {
        const state = this.state();
        const first = state.displayMessages;
        expect(state.displayMessages).toBe(first);

        state.setMessages([...state.messages, { id: 'a2', role: 'assistant', content: 'follow up', createdAt: 5 } as any]);
        const second = state.displayMessages;
        expect(second).not.toBe(first);
        expect(second.some(message => message.id === 'a2')).toBe(true);
    }

    @Test('streaming only re-renders the message whose content changed')
    streamingReusesUnchangedItems() {
        const state = this.state();
        const panel = new AgentConsoleMessagesPanelComponent(state);
        const first = panel.messageItems;
        const firstUser = first[0];
        const firstThought = first[1];

        const next = state.messages.slice();
        const toolIndex = next.findIndex(message => message.id === 'x1');
        next[toolIndex] = { ...next[toolIndex], content: 'tool output updated' };
        state.setMessages(next);

        const second = panel.messageItems;
        expect(second[0]).toBe(firstUser);
        expect(second[1]).toBe(firstThought);
        expect(second[toolIndex]).not.toBe(first[toolIndex]);
        expect(second[toolIndex].lines.some(line => line.content.includes('tool output updated'))).toBe(true);
    }
}

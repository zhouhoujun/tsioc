import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import {
    AgentConsoleMarkdownComponent,
    AgentConsoleSessionState,
    AgentConsoleThoughtTemplate,
    AgentConsoleToolTemplate,
    renderAgentConsoleMessageItems
} from '../src';

@Suite('viewport inline disclosure')
export class ViewportInlineDisclosureTest {
    protected state(): AgentConsoleSessionState {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messageLayout: 'viewport', reasoningPreviewLines: 1, auxiliaryPreviewLines: 1 });
        state.setMessages([
            { id: 'thought', role: 'assistant', content: 'thinking one\nthinking two\nthinking three', metadata: { uiEventType: 'reasoning' } },
            { id: 'answer', role: 'assistant', content: 'answer one\nanswer two\nanswer three' },
            { id: 'tool', role: 'tool', content: 'tool one\ntool two\ntool three', metadata: { type: 'shell' } }
        ] as any);
        return state;
    }

    @Test('collapses only reasoning and tool invocation rows')
    collapsesOnlyExecutionRows() {
        const state = this.state();
        const items = renderAgentConsoleMessageItems(state.displayMessages, {});
        const thoughtItem = items.find(item => item.semanticKind === 'thought');
        const answerItem = items.find(item => item.semanticKind === 'assistant-final');
        const toolItem = items.find(item => item.templateKind === 'tool');

        const thought = new AgentConsoleThoughtTemplate();
        thought.state = state;
        thought.item = thoughtItem;
        const tool = new AgentConsoleToolTemplate();
        tool.state = state;
        tool.item = toolItem;
        const answer = new AgentConsoleMarkdownComponent();
        answer.state = state;
        answer.item = answerItem;

        expect(thought.lines.length).toBe(1);
        expect(tool.lines.length).toBe(1);
        expect(answer.lines.length).toBe(3);
        expect(thought.lines[0].toggleMode).toBe('inline');
        expect(tool.lines[0].toggleMode).toBe('inline');
        expect(answer.lines.every(line => !line.toggleMode)).toBe(true);
        expect(thought.lines[0].toggleContent).toBe('');
    }

    @Test('expanding a reasoning row reveals the remaining lines inline')
    expandsInline() {
        const state = this.state();
        const items = renderAgentConsoleMessageItems(state.displayMessages, {});
        const thought = new AgentConsoleThoughtTemplate();
        thought.state = state;
        thought.item = items.find(item => item.semanticKind === 'thought');
        expect(thought.lines.length).toBe(1);

        state.toggleMessageExpanded('thought');
        expect(thought.lines.length).toBe(3);
        expect(thought.lines.every(line => line.toggleMode === 'inline')).toBe(true);
    }
}

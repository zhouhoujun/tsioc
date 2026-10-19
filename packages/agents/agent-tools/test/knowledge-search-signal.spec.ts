import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import type { AgentToolContext } from '@tsdi/agent';
import { DefaultKnowledgeAdapter } from '../src/default-adapters';
import { KnowledgeSearchTool } from '../knowledge/knowledge-search.tool';

@Suite('knowledge_search turn signal')
export class KnowledgeSearchSignalSpec {
    @Test('DefaultKnowledgeAdapter.search rejects when the signal is already aborted')
    async adapterRejectsAbortedSignal() {
        const adapter = new DefaultKnowledgeAdapter();
        await adapter.store({ title: 'alpha', content: 'alpha content' });
        const controller = new AbortController();
        controller.abort();
        let caught: any;
        const options = { signal: controller.signal };
        try {
            await adapter.search('alpha', options);
        } catch (error) {
            caught = error;
        }
        expect(!!caught).toBe(true);
        expect(caught?.name).toBe('AbortError');
    }

    @Test('knowledge_search forwards context.signal so an aborted turn rejects')
    async toolForwardsSignal() {
        const adapter = new DefaultKnowledgeAdapter();
        await adapter.store({ title: 'beta', content: 'beta content' });
        const tool = new KnowledgeSearchTool(adapter);
        const controller = new AbortController();
        controller.abort();
        let caught: any;
        try {
            await tool.invoke({ query: 'beta' }, { signal: controller.signal } as unknown as AgentToolContext);
        } catch (error) {
            caught = error;
        }
        expect(!!caught).toBe(true);
    }

    @Test('knowledge_search works without a signal')
    async worksWithoutSignal() {
        const adapter = new DefaultKnowledgeAdapter();
        await adapter.store({ title: 'gamma', content: 'gamma content' });
        const tool = new KnowledgeSearchTool(adapter);
        const result = await tool.invoke({ query: 'gamma' }, {} as unknown as AgentToolContext);
        expect(result.entries.length).toBe(1);
    }
}

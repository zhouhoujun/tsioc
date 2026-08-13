import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';

@Suite('Agent session sections (P107)')
export class SessionSectionsTest {
    @Test('adds sections with manual ordering')
    async addsSectionsWithOrdering() {
        const store = new InMemorySessionStore();
        const first = await store.addSection('session', 'Planning');
        const second = await store.addSection('session', 'Implementation');
        const third = await store.addSection('session', 'Review', second.id);

        const sections = await store.listSections('session');
        expect(sections.map(section => section.id)).toEqual([first.id, third.id, second.id]);
        expect(sections.map(section => section.label)).toEqual(['Planning', 'Review', 'Implementation']);
    }

    @Test('rejects duplicate section ids')
    async rejectsDuplicateIds() {
        const store = new InMemorySessionStore();
        await store.addSection('session', 'Planning', undefined, 'section-fixed');
        await expect(store.addSection('session', 'Duplicate', undefined, 'section-fixed')).rejects.toThrow(/already exists/);
    }

    @Test('renames sections')
    async renamesSection() {
        const store = new InMemorySessionStore();
        const section = await store.addSection('session', 'Planning');
        await store.renameSection('session', section.id, 'Planning & Design');
        const sections = await store.listSections('session');
        expect(sections[0].label).toEqual('Planning & Design');
    }

    @Test('moves sections to a new position')
    async movesSection() {
        const store = new InMemorySessionStore();
        const a = await store.addSection('session', 'A');
        const b = await store.addSection('session', 'B');
        const c = await store.addSection('session', 'C');
        await store.moveSection('session', c.id, a.id);
        expect((await store.listSections('session')).map(section => section.id)).toEqual([c.id, a.id, b.id]);
        await store.moveSection('session', a.id);
        expect((await store.listSections('session')).map(section => section.id)).toEqual([c.id, b.id, a.id]);
    }

    @Test('deleting a section clears message attribution')
    async deleteSectionClearsAttribution() {
        const store = new InMemorySessionStore();
        const section = await store.addSection('session', 'Workers');
        await store.appendRaw('session', { id: '1', role: 'assistant', content: 'done', createdAt: 1, sectionId: section.id });
        await store.deleteSection('session', section.id);

        expect(await store.listSections('session')).toEqual([]);
        const state = await store.get('session');
        expect(state.messages[0].sectionId).toBeUndefined();
    }

    @Test('attributes sub-agent messages to an origin-thread section')
    async attributesSubAgentMessages() {
        const store = new InMemorySessionStore();
        await store.append('session', {
            id: '1',
            role: 'assistant',
            content: 'worker result',
            createdAt: 1,
            metadata: { originThreadId: 'thread-w', originThreadLabel: 'Research' }
        });
        const sections = await store.listSections('session');
        expect(sections.length).toEqual(1);
        expect(sections[0].id).toEqual('section:thread-w');
        expect(sections[0].label).toEqual('Research');
        const state = await store.get('session');
        expect(state.messages[0].sectionId).toEqual('section:thread-w');
    }

    @Test('attributes messages in a sub-agent session by its own origin thread')
    async attributesBySessionOriginThread() {
        const store = new InMemorySessionStore();
        await store.setProjectMetadata('worker', {
            originThreadId: 'thread-parent',
            sessionRole: 'worker',
            focusSummary: 'Implement the parser'
        });
        await store.append('worker', { id: '1', role: 'assistant', content: 'done', createdAt: 1 });
        const sections = await store.listSections('worker');
        expect(sections.length).toEqual(1);
        expect(sections[0].label).toEqual('Implement the parser');
        expect((await store.get('worker')).messages[0].sectionId).toEqual('section:thread-parent');
    }

    @Test('preserves explicit sectionId over origin-thread attribution')
    async preservesExplicitSectionId() {
        const store = new InMemorySessionStore();
        const section = await store.addSection('session', 'Manual');
        await store.append('session', {
            id: '1',
            role: 'assistant',
            content: 'x',
            createdAt: 1,
            sectionId: section.id,
            metadata: { originThreadId: 'thread-w' }
        });
        const sections = await store.listSections('session');
        expect(sections.length).toEqual(1);
        expect((await store.get('session')).messages[0].sectionId).toEqual(section.id);
    }

    @Test('does not attribute ordinary messages')
    async leavesOrdinaryMessagesAlone() {
        const store = new InMemorySessionStore();
        await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
        expect(await store.listSections('session')).toEqual([]);
        expect((await store.get('session')).messages[0].sectionId).toBeUndefined();
    }

    @Test('fork copies sections and preserves section ids')
    async forkCopiesSections() {
        const store = new InMemorySessionStore();
        const section = await store.addSection('session', 'Planning');
        await store.appendRaw('session', { id: '1', role: 'assistant', content: 'done', createdAt: 1, sectionId: section.id });

        const forked = await store.fork('session', undefined, 'forked');
        const sections = await store.listSections('forked');
        expect(sections.length).toEqual(1);
        expect(sections[0].id).toEqual(section.id);
        expect(sections[0].label).toEqual('Planning');
        expect(forked.messages[0].sectionId).toEqual(section.id);
    }

    @Test('thread index exposes sections with message counts')
    async threadIndexExposesSections() {
        const store = new InMemorySessionStore();
        await store.setProjectMetadata('session', { primaryThreadId: 'thread-1', sessionRole: 'main' });
        const section = await store.addSection('session', 'Workers');
        await store.appendRaw('session', { id: '1', role: 'assistant', content: 'a', createdAt: 1, sectionId: section.id });
        await store.appendRaw('session', { id: '2', role: 'assistant', content: 'b', createdAt: 2, sectionId: section.id });

        const threads = await store.listThreads();
        expect(threads.length).toEqual(1);
        expect(threads[0].sections).toEqual([{ id: section.id, label: 'Workers', messageCount: 2 }]);
    }
}

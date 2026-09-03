import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ApplicationContext } from '@tsdi/core';
import { SessionStore } from '../src/memory/SessionStore';
import { runAgentOrmApp } from './helpers/agent-orm';

@Suite('Agent session sections (P107)')
export class SessionSectionsTest {
    @Test('adds sections with manual ordering')
    async addsSectionsWithOrdering() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            const first = await store.addSection('session', 'Planning');
            const second = await store.addSection('session', 'Implementation');
            const third = await store.addSection('session', 'Review', second.id);

            const sections = await store.listSections('session');
            expect(sections.map(section => section.id)).toEqual([first.id, third.id, second.id]);
            expect(sections.map(section => section.label)).toEqual(['Planning', 'Review', 'Implementation']);
        } finally { await ctx.close(); }
    }

    @Test('rejects duplicate section ids')
    async rejectsDuplicateIds() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await store.addSection('session', 'Planning', undefined, 'section-fixed');
            await expect(store.addSection('session', 'Duplicate', undefined, 'section-fixed')).rejects.toThrow(/already exists/);
        } finally { await ctx.close(); }
    }

    @Test('renames sections')
    async renamesSection() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            const section = await store.addSection('session', 'Planning');
            await store.renameSection('session', section.id, 'Planning & Design');
            const sections = await store.listSections('session');
            expect(sections[0].label).toEqual('Planning & Design');
        } finally { await ctx.close(); }
    }

    @Test('moves sections to a new position')
    async movesSection() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            const a = await store.addSection('session', 'A');
            const b = await store.addSection('session', 'B');
            const c = await store.addSection('session', 'C');
            await store.moveSection('session', c.id, a.id);
            expect((await store.listSections('session')).map(section => section.id)).toEqual([c.id, a.id, b.id]);
            await store.moveSection('session', a.id);
            expect((await store.listSections('session')).map(section => section.id)).toEqual([c.id, b.id, a.id]);
        } finally { await ctx.close(); }
    }

    @Test('deleting a section clears message attribution')
    async deleteSectionClearsAttribution() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            const section = await store.addSection('session', 'Workers');
            await store.appendRaw('session', { id: '1', role: 'assistant', content: 'done', createdAt: 1, sectionId: section.id });
            await store.deleteSection('session', section.id);

            expect(await store.listSections('session')).toEqual([]);
            const state = await store.get('session');
            expect(state.messages[0].sectionId).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('attributes sub-agent messages to an origin-thread section')
    async attributesSubAgentMessages() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
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
        } finally { await ctx.close(); }
    }

    @Test('attributes messages in a sub-agent session by its own origin thread')
    async attributesBySessionOriginThread() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
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
        } finally { await ctx.close(); }
    }

    @Test('preserves explicit sectionId over origin-thread attribution')
    async preservesExplicitSectionId() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
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
        } finally { await ctx.close(); }
    }

    @Test('does not attribute ordinary messages')
    async leavesOrdinaryMessagesAlone() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
            expect(await store.listSections('session')).toEqual([]);
            expect((await store.get('session')).messages[0].sectionId).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('fork copies sections and preserves section ids')
    async forkCopiesSections() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            const section = await store.addSection('session', 'Planning');
            await store.appendRaw('session', { id: '1', role: 'assistant', content: 'done', createdAt: 1, sectionId: section.id });

            const forked = await store.fork('session', undefined, 'forked');
            const sections = await store.listSections('forked');
            expect(sections.length).toEqual(1);
            expect(sections[0].id).toEqual(section.id);
            expect(sections[0].label).toEqual('Planning');
            expect(forked.messages[0].sectionId).toEqual(section.id);
        } finally { await ctx.close(); }
    }

    @Test('thread index exposes sections with message counts')
    async threadIndexExposesSections() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await store.setProjectMetadata('session', { primaryThreadId: 'thread-1', sessionRole: 'main' });
            const section = await store.addSection('session', 'Workers');
            await store.appendRaw('session', { id: '1', role: 'assistant', content: 'a', createdAt: 1, sectionId: section.id });
            await store.appendRaw('session', { id: '2', role: 'assistant', content: 'b', createdAt: 2, sectionId: section.id });

            const threads = await store.listThreads();
            expect(threads.length).toEqual(1);
            expect(threads[0].sections).toEqual([{ id: section.id, label: 'Workers', messageCount: 2 }]);
        } finally { await ctx.close(); }
    }
}
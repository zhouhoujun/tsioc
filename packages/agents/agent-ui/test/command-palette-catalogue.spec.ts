import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsoleParts, RuntimeStub, SchedulerStub, ToolRegistryStub } from './_helpers';

function build() {
    const parts = createConsoleParts(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
    parts.state.configure({ sessionId: 'session-1' } as any);
    return parts;
}

@Suite('command palette catalogue')
export class CommandPaletteCatalogueTest {
    @Test('lists the full non-hidden catalogue, not only the curated / menu')
    fullCatalogue() {
        const { state, component } = build();
        (component as any).openCommandPalette();
        const values = (state.selectMenu?.options || []).map(option => option.value);
        for (const command of ['/check', '/format', '/remotes', '/undo', '/permissions']) {
            expect(values).toContain(command);
        }
        expect(values.length).toBeGreaterThan(70);
    }

    @Test('puts recently executed commands first when the query is empty')
    recentsFirst() {
        const { state, component } = build();
        state.recordRecentCommand('/format');
        state.recordRecentCommand('/undo');
        (component as any).openCommandPalette();
        const values = (state.selectMenu?.options || []).map(option => option.value);
        expect(values.slice(0, 2)).toEqual(['/undo', '/format']);
    }

    @Test('a query filters the catalogue')
    filters() {
        const { state, component } = build();
        (component as any).openCommandPalette('format');
        const values = (state.selectMenu?.options || []).map(option => option.value);
        expect(values[0]).toEqual('/format');
        expect(values.every(value => value.includes('format'))).toEqual(true);
    }

    @Test('executing a command records it for the next palette')
    async recordsExecution() {
        const { state, component } = build();
        await (component as any).handleCommand('/highlights');
        expect(state.recentCommands[0]).toEqual('/highlights');
    }
}

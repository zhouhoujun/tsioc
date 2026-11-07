import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { TabBarComponent } from '@tsdi/components/common';
import { AgentConsoleSessionState } from '../src';
import { AgentConsoleSessionTabsSource } from '../src/AgentConsoleSessionTabsSource';

function seed(count: number, activeIndex: number, columns: number): AgentConsoleSessionTabsSource {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.sessions = Array.from({ length: count }, (_value, index) => ({
        id: `session-${index}`,
        title: `session ${index}`,
        workspace: '/tmp/ws',
        createdAt: index,
        updatedAt: index,
        current: index === activeIndex
    } as any));
    state.openSessionIds = state.sessions.map(session => session.id);
    state.sessionId = `session-${activeIndex}`;
    state.tabStripColumns = columns;
    return new AgentConsoleSessionTabsSource(state);
}

@Suite('session tab strip window')
export class SessionTabWindowTest {
    @Test('keeps every tab when the host has no terminal width (browser)')
    allTabs() {
        const source = seed(12, 0, 0);
        const items = source.items;
        expect(items.length).toEqual(12);
        expect(items.some(item => item.disabled)).toEqual(false);
    }

    @Test('windows a long strip around the active tab and adds overflow markers')
    windowsLongStrip() {
        // Active tab at the end: the window clips from the left.
        const tail = seed(12, 11, 60).items;
        expect(tail[0].disabled).toEqual(true);
        expect(tail[0].id).toEqual('');
        expect(tail[tail.length - 1].id).toEqual('session-11');
        expect(tail[tail.length - 1].active).toEqual(true);
        expect(tail.length).toBeLessThan(12);

        // Active tab in the middle: markers on both sides.
        const middle = seed(12, 6, 60).items;
        expect(middle[0].disabled).toEqual(true);
        expect(middle[middle.length - 1].disabled).toEqual(true);
        expect(middle.some(item => item.id === 'session-6' && item.active)).toEqual(true);
    }

    @Test('a disabled overflow marker is not selectable')
    markerIsInert() {
        const bar = new TabBarComponent();
        const selected: string[] = [];
        bar.source = {
            visible: true,
            items: [{ id: '', label: ' … ', disabled: true }, { id: 'session-1', label: ' one ', active: true }],
            select: (id: string) => selected.push(id),
            create: () => undefined,
            close: () => undefined
        };
        bar.select('');
        bar.select('session-1');
        expect(selected).toEqual(['session-1']);
    }
}

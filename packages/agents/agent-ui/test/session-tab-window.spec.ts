import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { TabBarComponent } from '@tsdi/components/common/tab-bar';
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
        expect(source.windowed).toEqual(false);
        expect(source.canScrollBack).toEqual(false);
        expect(source.canScrollForward).toEqual(false);
    }

    @Test('windows a long strip around the active tab without inert markers')
    windowsLongStrip() {
        // Active tab at the end: the page ends on it.
        const tail = seed(12, 11, 60);
        const tailItems = tail.items;
        expect(tail.windowed).toEqual(true);
        expect(tailItems.length).toBeLessThan(12);
        expect(tailItems.some(item => item.disabled)).toEqual(false);
        expect(tailItems[tailItems.length - 1].id).toEqual('session-11');
        expect(tailItems[tailItems.length - 1].active).toEqual(true);
        expect(tail.canScrollBack).toEqual(true);
        expect(tail.canScrollForward).toEqual(false);

        // Active tab in the middle: both arrows can page.
        const middle = seed(12, 6, 60);
        const middleItems = middle.items;
        expect(middleItems.some(item => item.id === 'session-6' && item.active)).toEqual(true);
        expect(middle.canScrollBack).toEqual(true);
        expect(middle.canScrollForward).toEqual(true);
    }

    @Test('the arrows page the strip and the active change re-centers it')
    pagesWithArrows() {
        const source = seed(12, 0, 60);
        const first = source.items;
        expect(first[0].id).toEqual('session-0');
        expect(source.canScrollBack).toEqual(false);
        expect(source.canScrollForward).toEqual(true);

        source.scrollForward();
        const second = source.items;
        expect(second[0].id).toEqual('session-3');
        expect(second[0].id).not.toEqual(first[0].id);
        expect(source.canScrollBack).toEqual(true);

        // The tab bar forwards the arrow clicks to the same paging actions.
        const bar = new TabBarComponent();
        bar.source = source;
        expect(bar.arrowsVisible).toEqual(false);
        expect(bar.overflowMenuVisible).toEqual(true);
        expect(bar.overflowMenuItems.length).toEqual(12);
        expect(bar.overflowLabel).toEqual(' … ');
        bar.scrollForward();
        expect(source.items[0].id).not.toEqual(second[0].id);

        // Selecting another tab abandons the manual page and follows it.
        (source as any).state.sessionId = 'session-11';
        const followed = source.items;
        expect(followed[followed.length - 1].id).toEqual('session-11');
        expect(followed[followed.length - 1].active).toEqual(true);
        expect(source.canScrollForward).toEqual(false);
    }

    @Test('paging stops at both edges')
    pagesToEdges() {
        const source = seed(12, 0, 60);
        source.scrollBack();
        expect(source.items[0].id).toEqual('session-0');
        for (let index = 0; index < 8; index += 1) {
            source.scrollForward();
        }
        const last = source.items;
        expect(last[last.length - 1].id).toEqual('session-11');
        expect(source.canScrollForward).toEqual(false);
    }

    @Test('a short last page still pages back to a full page')
    pagesBackFromShortTail() {
        // 13 tabs leave a one-tab last page on a three-tab page size.
        const source = seed(13, 0, 60);
        const pageSize = source.items.length;
        expect(pageSize).toBeGreaterThan(1);
        for (let index = 0; index < 12; index += 1) {
            source.scrollForward();
        }
        expect(source.canScrollForward).toEqual(false);
        expect(source.items.length).toBeLessThan(pageSize);
        source.scrollBack();
        expect(source.items.length).toBeGreaterThan(1);
        expect(source.items[source.items.length - 1].id).toEqual('session-11');
    }

    @Test('a disabled marker is not selectable')
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

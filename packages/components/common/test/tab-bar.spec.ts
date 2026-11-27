import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TabBarComponent, TabBarSource } from '../tab-bar';

@Suite('common tab bar')
export class TabBarComponentTest {
    @Test('paints the source items and forwards tab selection/creation')
    forwardsHostActions() {
        const bar = new TabBarComponent();
        const selected: string[] = [];
        const closed: string[] = [];
        let created = 0;
        const source: TabBarSource = {
            visible: true,
            items: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
            createLabel: ' + ',
            createTitle: 'New session',
            select: id => selected.push(id),
            create: () => { created += 1; },
            close: id => closed.push(id)
        };
        bar.source = source;
        expect(bar.visible).toEqual(true);
        expect(bar.items.map(item => item.label)).toEqual(['Alpha', 'Beta']);
        expect(bar.createLabel).toEqual(' + ');
        expect(bar.newTabTitle).toEqual('New session');
        expect(bar.closeLabel).toEqual('✕');
        bar.select('b');
        bar.create();
        bar.close('a');
        expect(selected).toEqual(['b']);
        expect(created).toEqual(1);
        expect(closed).toEqual(['a']);
    }

    @Test('is renderer-neutral: no source means sensible defaults')
    toleratesMissingSource() {
        const bar = new TabBarComponent();
        bar.select('a');
        bar.create();
        bar.close('a');
        expect(bar.visible).toEqual(true);
        expect(bar.items).toEqual([]);
        expect(bar.showCreate).toEqual(true);
        expect(bar.createLabel).toEqual('+');
        expect(bar.newTabTitle).toEqual('New tab');
        expect(bar.closeLabel).toEqual('✕');
    }

    @Test('reorders dragged tabs and forwards context actions')
    async reorderAndContext() {
        const bar = new TabBarComponent();
        bar.source = {
            visible: true,
            items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]
        };
        let order: string[] = [];
        let contextId = '';
        bar.reorderAction = (ids, id, targetId) => { order = ids; };
        bar.contextAction = id => { contextId = id; };
        bar.dragStart(bar.items[0], { dataTransfer: { setData() { } } });
        bar.dropOn(bar.items[2], { preventDefault() { } });
        expect(order).toEqual(['b', 'c', 'a']);
        bar.contextMenu(bar.items[1], { preventDefault() { }, stopPropagation() { } });
        expect(contextId).toEqual('b');
    }

    @Test('Alt+Arrow reorders tabs through the same callback')
    async keyboardReorder() {
        const bar = new TabBarComponent();
        let order: string[] = [];
        bar.source = {
            visible: true,
            items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
            select() { }
        };
        bar.reorderAction = ids => { order = ids; };
        bar.onTabKeydown({ key: 'ArrowRight', altKey: true, preventDefault() { } }, bar.items[0], 0);
        expect(order).toEqual(['b', 'a', 'c']);
        bar.onTabKeydown({ key: 'ArrowLeft', altKey: true, preventDefault() { } }, bar.items[2], 2);
        expect(order).toEqual(['a', 'c', 'b']);
    }

    @Test('built-in context menu closes tabs without a host callback')
    async builtInContextMenu() {
        const bar = new TabBarComponent();
        const closed: string[] = [];
        bar.source = {
            visible: true,
            items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
            close: id => closed.push(id)
        };
        bar.contextMenu(bar.items[1], { clientX: 30, clientY: 40, preventDefault() { } });
        expect(bar.contextMenuOpen).toEqual(true);
        expect(bar.contextX).toEqual(30);
        expect(bar.contextY).toEqual(40);
        bar.runTabContext('closeRight', 'b');
        expect(closed).toEqual(['c']);
        expect(bar.contextMenuOpen).toEqual(false);
    }

    @Test('host-windowed strips default to one more menu')
    overflowsWindowedSource() {
        const bar = new TabBarComponent();
        const selected: string[] = [];
        bar.source = {
            visible: true,
            items: [{ id: 'a', label: ' Alpha ', active: true }],
            windowed: true,
            overflowItems: [
                { id: 'a', label: ' Alpha ', active: true },
                { id: 'b', label: ' Beta ' }
            ],
            canScrollBack: false,
            canScrollForward: true,
            select: id => selected.push(id)
        };
        expect(bar.arrowsVisible).toEqual(false);
        expect(bar.overflowMenuVisible).toEqual(true);
        expect(bar.overflowMenuItems.map(item => item.id)).toEqual(['a', 'b']);
        bar.pickOverflow('b');
        expect(selected).toEqual(['b']);
    }

    @Test('host-windowed strips page through the source arrows')
    pagesWindowedSource() {
        const bar = new TabBarComponent();
        const paged: string[] = [];
        let backEnabled = false;
        let forwardEnabled = true;
        bar.source = {
            visible: true,
            items: [{ id: 'a', label: ' Alpha ', active: true }],
            windowed: true,
            overflowMode: 'scroll',
            overflowItems: [{ id: 'a', label: ' Alpha ', active: true }],
            get canScrollBack() { return backEnabled; },
            get canScrollForward() { return forwardEnabled; },
            scrollBack: () => { paged.push('back'); backEnabled = false; forwardEnabled = true; },
            scrollForward: () => { paged.push('forward'); backEnabled = true; forwardEnabled = false; }
        };
        expect(bar.hostWindowed).toEqual(true);
        expect(bar.arrowsVisible).toEqual(true);
        expect(bar.scrollBackDisabled).toEqual(true);
        expect(bar.scrollForwardDisabled).toEqual(false);
        bar.scrollBack();
        expect(paged).toEqual([]);
        bar.scrollForward();
        expect(paged).toEqual(['forward']);
        expect(bar.scrollBackDisabled).toEqual(false);
        expect(bar.scrollForwardDisabled).toEqual(true);
    }
}

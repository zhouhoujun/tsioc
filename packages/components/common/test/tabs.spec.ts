import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TabsComponent, TabsSource } from '../tabs';

function createSource(selected: string[]): TabsSource {
    return {
        visible: true,
        items: [
            { id: 'a', label: ' Alpha ', active: true, showClose: true },
            { id: 'b', label: ' Beta ', active: false, showClose: false }
        ],
        createLabel: ' + ',
        select: id => selected.push(id),
        create: () => undefined,
        close: () => undefined
    };
}

@Suite('common tabs')
export class TabsComponentTest {
    @Test('reuses the shared strip and activates only the selected pane')
    activatesSelectedPane() {
        const selected: string[] = [];
        const tabs = new TabsComponent();
        tabs.source = createSource(selected);
        expect(tabs.currentId).toEqual('a');
        expect(tabs.stripOnly).toEqual(false);
        expect(tabs.barSource.items.map(item => item.id)).toEqual(['a', 'b']);

        tabs.barSource.select?.('b');
        expect(selected).toEqual(['b']);
        expect(tabs.currentId).toEqual('b');
    }

    @Test('keeps panes mounted and toggles only their display style')
    hidesInactivePanesWithoutDestroyingThem() {
        const tabs = new TabsComponent();
        tabs.source = createSource([]);
        const panes = [
            { id: 'a', style: {} as Record<string, string>, getAttribute(name: string) { return name === 'data-tab-id' ? this.id : null; } },
            { id: 'b', style: {} as Record<string, string>, getAttribute(name: string) { return name === 'data-tab-id' ? this.id : null; } }
        ];
        (tabs as any).panes = {
            nativeElement: {
                querySelectorAll: () => panes
            }
        };
        tabs.syncVisibility();
        expect(panes[0].style.display).toEqual('');
        expect(panes[1].style.display).toEqual('none');

        tabs.activate('b');
        tabs.syncVisibility();
        expect(panes[0].style.display).toEqual('none');
        expect(panes[1].style.display).toEqual('');
        // Both nodes still exist: switching hides instead of destroying.
        expect(panes.map(pane => pane.id)).toEqual(['a', 'b']);
    }

    @Test('tolerates hosts without a tab source')
    withoutSource() {
        const tabs = new TabsComponent();
        expect(tabs.currentId).toEqual('');
        expect(tabs.barSource.visible).toEqual(false);
        expect(tabs.barSource.items).toEqual([]);
        tabs.activate('a');
        expect(tabs.activeId).toEqual('a');
    }
}

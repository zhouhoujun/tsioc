import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { MenuBarComponent, MenuBarGroup } from '../menu-bar';

const groups: MenuBarGroup[] = [
    {
        items: [
            { id: 'run', label: 'Run', icon: '▶' },
            { id: 'stop', label: 'Stop', disabled: true, danger: true }
        ]
    },
    {
        label: 'Edit',
        items: [
            { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', checked: true, type: 'checkbox' as const }
        ]
    }
];

@Suite('common menu bar')
export class MenuBarComponentTest {
    @Test('flattens groups into separators, titles and actionable entries')
    paintsGroups() {
        const menu = new MenuBarComponent();
        menu.groups = groups;

        const entries = menu.entries;
        expect(entries.map(entry => entry.kind)).toEqual(['item', 'item', 'separator', 'title', 'item']);
        expect(entries[1].disabled).toBe(true);
        expect(entries[1].className).toContain('is-danger');
        expect(entries[4].shortcut).toEqual('Ctrl+Z');
        expect(entries[4].className).toContain('is-checked');
        expect(entries[4].role).toEqual('menuitemcheckbox');
        expect(entries[4].ariaChecked).toEqual('true');
        expect(entries[0].role).toEqual('menuitem');
        expect(entries[0].ariaChecked).toEqual('');
    }

    @Test('toggles open state and forwards the selected id')
    forwardsSelection() {
        const menu = new MenuBarComponent();
        menu.groups = groups;
        const selected: string[] = [];
        const states: boolean[] = [];
        menu.selectAction = id => selected.push(id);
        menu.openChange.subscribe(open => states.push(open));

        menu.toggle();
        expect(menu.open).toBe(true);
        menu.choose('undo');
        expect(selected).toEqual(['undo']);
        expect(menu.open).toBe(false);
        expect(states).toEqual([true, false]);
    }

    @Test('disabled and unknown entries never fire actions')
    ignoresDisabled() {
        const menu = new MenuBarComponent();
        menu.groups = groups;
        const selected: string[] = [];
        menu.selectAction = id => selected.push(id);
        menu.toggle();
        menu.choose('stop');
        menu.choose('missing');
        expect(selected).toEqual([]);
        expect(menu.open).toBe(true);
    }

    @Test('a disabled trigger cannot open the menu')
    disabledTrigger() {
        const menu = new MenuBarComponent();
        menu.groups = groups;
        menu.disabled = true;
        menu.toggle();
        expect(menu.open).toBe(false);
    }
}

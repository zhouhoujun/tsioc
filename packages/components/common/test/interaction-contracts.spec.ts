import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { nextButtonGroupIndex } from '../button';
import { TabBarComponent } from '../tab-bar';
import { ToolbarComponent } from '../toolbar';
import { AccordionGroupComponent } from '../accordion';
import { MenuBarComponent } from '../menu-bar';
import { SelectComponent } from '../select';
import { TreeComponent } from '../tree';

@Suite('common interaction contracts')
export class InteractionContractsTest {
    @Test('button groups compute wrapped arrow navigation')
    async buttonGroup() {
        expect(nextButtonGroupIndex(0, 3, 'ArrowRight')).toEqual(1);
        expect(nextButtonGroupIndex(2, 3, 'ArrowRight')).toEqual(0);
        expect(nextButtonGroupIndex(0, 3, 'ArrowLeft')).toEqual(2);
        expect(nextButtonGroupIndex(1, 3, 'Home')).toEqual(0);
        expect(nextButtonGroupIndex(1, 3, 'End')).toEqual(2);
        expect(nextButtonGroupIndex(0, 0, 'ArrowRight')).toEqual(-1);
    }

    @Test('tab strips expose reorder and context hooks')
    async tabContracts() {
        const bar = new TabBarComponent();
        bar.source = { visible: true, items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] };
        let order: string[] = [];
        let context = '';
        bar.reorderAction = ids => { order = ids; };
        bar.contextAction = id => { context = id; };
        bar.dragStart(bar.items[1], {});
        bar.dropOn(bar.items[0], {});
        expect(order).toEqual(['b', 'a']);
        bar.contextMenu(bar.items[0], {});
        expect(context).toEqual('a');
    }

    @Test('toolbars reorder commands and keep separators')
    async toolbarContracts() {
        const toolbar = new ToolbarComponent();
        toolbar.items = [{ id: 'a', label: 'A' }, { kind: 'separator' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
        let next: any[] = [];
        toolbar.reorderAction = items => { next = items; };
        const commands = (toolbar as any).commandItems;
        toolbar.dragStart(commands[0], {});
        toolbar.dropOn(commands[2], {});
        expect(next.filter(item => item.id).map(item => item.id)).toEqual(['b', 'c', 'a']);
        expect(next.some(item => item.kind === 'separator')).toEqual(true);
    }

    @Test('accordion groups are single-open by default and multi-open when configured')
    async accordionGroups() {
        const items = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
        const group = new AccordionGroupComponent();
        group.items = items;
        group.toggle(items[0], true);
        group.toggle(items[1], true);
        expect(group.isExpanded(items[0])).toBe(false);
        expect(group.isExpanded(items[1])).toBe(true);
        group.multiple = true;
        group.toggle(items[0], true);
        expect(group.expandedIds).toEqual(['a']);
    }

    @Test('menu items map checkbox/radio semantics')
    async menuRoles() {
        const menu = new MenuBarComponent();
        menu.groups = [{ items: [
            { id: 'plain', label: 'Plain' },
            { id: 'check', label: 'Check', type: 'checkbox', checked: true },
            { id: 'radio', label: 'Radio', type: 'radio', checked: false }
        ] }];
        expect(menu.entries.map(entry => entry.role)).toEqual(['menuitem', 'menuitemcheckbox', 'menuitemradio']);
        expect(menu.entries.map(entry => entry.ariaChecked)).toEqual(['', 'true', 'false']);
    }

    @Test('select multi mode toggles values and tree checkboxes update checked ids')
    async selectionContracts() {
        const select = new SelectComponent();
        select.options = [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }];
        select.multiple = true;
        const values: string[][] = [];
        select.valuesAction = next => values.push(next);
        select.choose(0);
        select.choose(1);
        select.choose(0);
        expect(select.values).toEqual(['b']);
        expect(values).toEqual([['a'], ['a', 'b'], ['b']]);

        const tree = new TreeComponent();
        tree.items = [{ id: 'root', label: 'Root', children: [{ id: 'leaf', label: 'Leaf' }] }];
        tree.checkable = true;
        tree.multiple = true;
        tree.toggleCheckedKey('leaf', tree.items[0].children![0]);
        expect(tree.checkedIds.sort()).toEqual(['leaf', 'root']);
    }
}

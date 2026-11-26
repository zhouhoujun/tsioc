import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DataTableColumnChooserComponent } from '../data-table';

@Suite('common data table column chooser')
export class DataTableChooserTest {
    columns = [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status' }
    ];

    @Test('toggles visibility, reorders columns and resets the layout')
    async controls() {
        const chooser = new DataTableColumnChooserComponent();
        chooser.columns = this.columns;
        const states: any[] = [];
        chooser.changeAction = state => states.push(state);
        expect(chooser.items.map(item => item.key)).toEqual(['name', 'role', 'status']);

        chooser.toggle('role');
        expect(chooser.hiddenColumns).toEqual(['role']);
        expect(states[0].hidden).toEqual(['role']);

        chooser.move('status', -1);
        expect(chooser.items.map(item => item.key)).toEqual(['name', 'status', 'role']);
        expect(states[1].order).toEqual(['name', 'status', 'role']);

        chooser.reset();
        expect(chooser.hiddenColumns).toEqual([]);
        expect(chooser.columnOrder).toEqual([]);
        expect(chooser.items.map(item => item.key)).toEqual(['name', 'role', 'status']);
    }

    @Test('keyboard Space toggles a column checkbox')
    async keyboard() {
        const chooser = new DataTableColumnChooserComponent();
        chooser.columns = this.columns;
        chooser.checkKeydown({ key: ' ', preventDefault() { } }, 'name');
        expect(chooser.hiddenColumns).toEqual(['name']);
    }
}

import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AccordionGroupComponent } from '../accordion';

@Suite('common accordion group')
export class AccordionGroupTest {
    items = [
        { id: 'a', title: 'A', items: [{ id: 'a1', label: 'A1' }] },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' }
    ];

    @Test('single-open mode ensures only one expanded section')
    async singleOpen() {
        const group = new AccordionGroupComponent();
        group.items = this.items;
        const toggles: any[] = [];
        group.toggleAction = (id, expanded) => toggles.push([id, expanded]);
        group.toggle(group.items[0], true);
        expect(group.isExpanded(group.items[0])).toBe(true);
        expect(group.isExpanded(group.items[1])).toBe(false);
        group.toggle(group.items[1], true);
        expect(group.activeId).toEqual('b');
        expect(group.isExpanded(group.items[0])).toBe(false);
        expect(group.isExpanded(group.items[1])).toBe(true);
        group.toggle(group.items[1], false);
        expect(group.activeId).toEqual('');
        expect(toggles).toEqual([['a', true], ['b', true], ['b', false]]);
    }

    @Test('multiple mode keeps independent expanded sections')
    async multipleOpen() {
        const group = new AccordionGroupComponent();
        group.items = this.items;
        group.multiple = true;
        group.toggle(group.items[0], true);
        group.toggle(group.items[2], true);
        expect(group.expandedIds).toEqual(['a', 'c']);
        expect(group.isExpanded(group.items[0])).toBe(true);
        expect(group.isExpanded(group.items[2])).toBe(true);
        group.toggle(group.items[0], false);
        expect(group.expandedIds).toEqual(['c']);
    }
}

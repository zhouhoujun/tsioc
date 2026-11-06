import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TabBarComponent, TabBarSource } from '../src';

@Suite('common tab bar')
export class CommonTabBarTest {
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
            select: id => selected.push(id),
            create: () => { created += 1; },
            close: id => closed.push(id)
        };
        bar.source = source;
        expect(bar.visible).toEqual(true);
        expect(bar.items.map(item => item.label)).toEqual(['Alpha', 'Beta']);
        expect(bar.createLabel).toEqual(' + ');
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
        expect(bar.closeLabel).toEqual('✕');
    }
}

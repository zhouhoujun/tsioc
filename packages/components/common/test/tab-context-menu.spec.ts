import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TabContextMenuComponent } from '../tab-bar';

@Suite('common tab context menu')
export class TabContextMenuTest {
    @Test('renders fixed actions, forwards selection and closes')
    async actions() {
        const menu = new TabContextMenuComponent();
        const calls: string[] = [];
        let closed = 0;
        menu.visible = true;
        menu.x = 120;
        menu.y = 80;
        menu.tabId = 'tab-2';
        menu.actionAction = (action, id) => calls.push(`${action}:${id}`);
        menu.closeAction = () => { closed += 1; };
        expect(menu.menuStyle.position).toEqual('fixed');
        expect(menu.menuStyle.left).toEqual('120px');
        menu.run(menu.actions[0]);
        expect(calls).toEqual(['close:tab-2']);
        expect(closed).toEqual(1);
        menu.run({ id: 'x', label: 'X', disabled: true });
        expect(calls).toEqual(['close:tab-2']);
    }
}

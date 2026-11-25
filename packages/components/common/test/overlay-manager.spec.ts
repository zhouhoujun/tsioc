import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { OverlayEntry, OverlayManager } from '../src/overlay-manager';

@Suite('common overlay manager')
export class OverlayManagerTest {
    @Test('only the top overlay is dismissed and focus is restored to the next one')
    async stackAndFocus() {
        const focused: Array<string | undefined> = [];
        const manager = new OverlayManager({
            focusInitial: entry => focused.push(`open:${entry.id}`),
            restoreFocus: entry => focused.push(`restore:${entry?.id}`)
        });
        manager.register({ id: 'dialog', kind: 'dialog' });
        manager.register({ id: 'popover', kind: 'popover' });
        expect(manager.size).toEqual(2);
        expect(manager.isTop('popover')).toEqual(true);
        expect(manager.close('dialog')).toEqual(true);
        expect(focused).toEqual(['open:dialog', 'open:popover', 'restore:popover']);
        expect(await manager.escape()).toEqual('closed');
        expect(focused).toEqual(['open:dialog', 'open:popover', 'restore:popover', 'restore:undefined']);
    }

    @Test('beforeClose can veto programmatic dismissal')
    async dirtyCheck() {
        const closed: string[] = [];
        const entry: OverlayEntry = {
            id: 'form',
            kind: 'dialog',
            beforeClose: () => false,
            close: reason => { closed.push(reason); }
        };
        const manager = new OverlayManager();
        manager.register(entry);
        expect(await manager.escape()).toEqual('blocked');
        expect(manager.size).toEqual(1);
        expect(closed).toEqual([]);

        entry.beforeClose = async () => true;
        expect(await manager.outside()).toEqual('closed');
        expect(closed).toEqual(['outside']);
        expect(manager.size).toEqual(0);
    }

    @Test('duplicate ids and closing an unknown overlay are ignored')
    async ids() {
        const manager = new OverlayManager();
        expect(manager.register({ id: 'a', kind: 'menu' })).toEqual(true);
        expect(manager.register({ id: 'a', kind: 'menu' })).toEqual(false);
        expect(manager.close('missing')).toEqual(false);
        expect(await new OverlayManager().escape()).toEqual('missing');
    }
}

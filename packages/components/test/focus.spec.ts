import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FocusRegionManager } from '../src';

@Suite('focus region manager')
export class FocusRegionManagerSpec {
    @Test('switches ownership with paired blur and focus callbacks')
    switchesOwnership() {
        const manager = new FocusRegionManager();
        const calls: string[] = [];
        manager.register({ id: 'composer', focus: () => calls.push('composer:focus'), blur: () => calls.push('composer:blur') });
        manager.register({ id: 'transcript', focus: () => calls.push('transcript:focus') });
        manager.focus('composer');
        manager.focus('transcript');
        expect(manager.activeRegion).toEqual('transcript');
        expect(calls).toEqual(['composer:focus', 'composer:blur', 'transcript:focus']);
    }

    @Test('routes keys only to the active region')
    async routesKeys() {
        const manager = new FocusRegionManager();
        const calls: string[] = [];
        manager.register({ id: 'composer', handleKey: () => { calls.push('composer'); return true; } });
        manager.register({ id: 'transcript', handleKey: () => { calls.push('transcript'); return true; } });
        manager.focus('transcript');
        expect(await manager.routeKey('pageup')).toEqual(true);
        expect(calls).toEqual(['transcript']);
    }

    @Test('mouse hit testing focuses the highest priority matching region')
    async routesMouseByPriority() {
        const manager = new FocusRegionManager();
        manager.register({ id: 'transcript', priority: 1, contains: () => true });
        manager.register({ id: 'overlay', priority: 10, contains: () => true });
        expect(await manager.routeMouse({}, {})).toEqual(true);
        expect(manager.activeRegion).toEqual('overlay');
    }
}

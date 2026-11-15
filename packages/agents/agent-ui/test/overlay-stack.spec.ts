import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { closeTextOverlay, openTextOverlay } from '../src/AgentConsoleOverlayState';

@Suite('dialog overlay stack')
export class OverlayStackTest {
    @Test('closing a text overlay can restore its parent dialog')
    restoresParent() {
        let restored = 0;
        const state: any = {
            textOverlay: null,
            textOverlayBack: undefined,
            maxOverlayVisibleLines: 0,
            syncDerivedInputFocus: () => undefined
        };
        openTextOverlay(state, 'Help · Core', ['/help'], undefined, () => { restored += 1; });
        expect(state.textOverlay?.title).toEqual('Help · Core');
        closeTextOverlay(state, true);
        expect(state.textOverlay).toEqual(null);
        expect(restored).toEqual(1);

        // Programmatic closes (submit/toast/new overlay) must not re-open a menu.
        openTextOverlay(state, 'Help', ['x'], undefined, () => { restored += 1; });
        closeTextOverlay(state);
        expect(restored).toEqual(1);
    }
}

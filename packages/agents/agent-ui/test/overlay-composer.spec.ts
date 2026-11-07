import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';

@Suite('notice overlay keeps the composer usable')
export class OverlayComposerTest {
    @Test('typing and submitting still work while a read-only notice dialog is open')
    async composerUnderOverlay() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        try {
            const state = component.sessionState;
            state.openTextOverlay('notice', ['line one', 'line two']);
            expect(state.hasTextOverlayFocus()).toEqual(true);

            // Printable keys reach the composer instead of being swallowed.
            await (component as any).handleTerminalInput({ text: 'h', partial: false }, 'h');
            await (component as any).handleTerminalInput({ text: 'i', partial: false }, 'i');
            expect(state.input).toEqual('hi');

            // Submitting dismisses the dialog and clears the draft.
            await component.submit();
            expect(state.hasTextOverlayFocus()).toEqual(false);
            expect(state.input).toEqual('');
        } finally {
            component.onDestroy();
        }
    }

    @Test('escape still dismisses the dialog before the composer sees it')
    async escapeDismissesOverlay() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        try {
            const state = component.sessionState;
            state.openTextOverlay('notice', ['line one', 'line two']);
            await (component as any).handleTerminalInput({ text: '\u001b', controlKey: 'escape', partial: false }, '\u001b');
            expect(state.hasTextOverlayFocus()).toEqual(false);
        } finally {
            component.onDestroy();
        }
    }
}

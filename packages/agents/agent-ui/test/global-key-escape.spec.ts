import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { handleBrowserGlobalKeyInputView, handleGlobalKeyInputView } from '../src/AgentConsoleGlobalKeyInputController';

function hostWith(options: { running: boolean; menu: boolean; approval?: boolean }): { host: any; interrupts: () => number } {
    let interrupts = 0;
    const host: any = {
        translator: null,
        keymapRecording: undefined,
        state: {
            whichKeyVisible: false,
            whichKeyPage: 0,
            hasCommandOutputsFocus: () => false,
            approvalsFocused: !!options.approval,
            pendingApprovals: options.approval ? [{ id: 'approval-1' }] : [],
            selectMenu: options.menu ? { kind: 'suggestions', options: [{ value: '/status' }] } : undefined,
            focusLayers: {
                isAnyFocusActive: () => false,
                hasBlockingSelectMenu: () => false
            },
            setWhichKeyVisible: () => undefined
        },
        isTurnInProgress: () => options.running,
        interruptTurn: async () => { interrupts += 1; },
        globalKeymap: { resolve: () => undefined, set: () => true },
        resolveKeymapContext: () => 'composer',
        handleIdleEscape: () => true
    };
    return { host, interrupts: () => interrupts };
}

/**
 * The first Escape belongs to an open `/`/`@` menu: it must dismiss the list,
 * not cancel the running turn. Real TUI: typing `/sta` mid-turn and pressing
 * Esc showed `Turn cancelled` instead of closing the completion menu.
 */
@Suite('global escape with an open menu')
export class GlobalEscapeMenuTest {

    @Test('an open menu keeps the first Escape from cancelling the turn')
    async menuOwnsEscape() {
        const { host, interrupts } = hostWith({ running: true, menu: true });
        expect(await handleGlobalKeyInputView(host, '\u001b')).toBe(false);
        expect(interrupts()).toEqual(0);
    }

    @Test('without a menu Escape still cancels the running turn')
    async escapeCancelsWithoutMenu() {
        const { host, interrupts } = hostWith({ running: true, menu: false });
        expect(await handleGlobalKeyInputView(host, '\u001b')).toBe(true);
        expect(interrupts()).toEqual(1);
    }

    @Test('a pending approval owns Escape instead of cancelling the turn')
    async approvalOwnsEscape() {
        const { host, interrupts } = hostWith({ running: true, menu: false, approval: true });
        expect(await handleGlobalKeyInputView(host, '\u001b')).toBe(false);
        expect(interrupts()).toEqual(0);
        expect(await handleBrowserGlobalKeyInputView(host, 'Escape', {})).toBe(false);
        expect(interrupts()).toEqual(0);
    }

    @Test('an idle console with no menu falls through to the keymap')
    async idleEscapeFallsThrough() {
        const { host, interrupts } = hostWith({ running: false, menu: false });
        expect(await handleGlobalKeyInputView(host, '\u001b')).toBe(false);
        expect(interrupts()).toEqual(0);
    }
}

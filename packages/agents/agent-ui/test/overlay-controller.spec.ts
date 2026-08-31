import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleOverlayController } from '../src/AgentConsoleOverlay';
import type { AgentConsoleSelectOption } from '../src';

const controller = new AgentConsoleOverlayController();

function option(label: string, extra: Partial<AgentConsoleSelectOption> = {}): AgentConsoleSelectOption {
    return { label, value: label, ...extra };
}

@Suite('Agent console overlay controller (P266)')
export class AgentConsoleOverlayControllerTest {

    @Test('clampIndex clamps into range and returns 0 for empty')
    async clampIndexClamps() {
        expect(controller.clampIndex(-3, 5)).toEqual(0);
        expect(controller.clampIndex(9, 5)).toEqual(4);
        expect(controller.clampIndex(2, 5)).toEqual(2);
        expect(controller.clampIndex(0, 0)).toEqual(0);
    }

    @Test('moveIndex wraps around for positive and negative deltas')
    async moveIndexWraps() {
        expect(controller.moveIndex(0, 1, 3)).toEqual(1);
        expect(controller.moveIndex(2, 1, 3)).toEqual(0);
        expect(controller.moveIndex(0, -1, 3)).toEqual(2);
        expect(controller.moveIndex(1, -2, 3)).toEqual(2);
        expect(controller.moveIndex(0, 0, 0)).toEqual(0);
    }

    @Test('homeIndex endIndex and pageIndex move to edges and clamp pages')
    async edgeAndPageIndexes() {
        expect(controller.homeIndex(5)).toEqual(0);
        expect(controller.endIndex(5)).toEqual(4);
        expect(controller.homeIndex(0)).toEqual(0);
        expect(controller.endIndex(0)).toEqual(0);
        expect(controller.pageIndex(0, 1, 25)).toEqual(10);
        expect(controller.pageIndex(20, 1, 25)).toEqual(24);
        expect(controller.pageIndex(4, -1, 25)).toEqual(0);
        expect(controller.pageIndex(0, 1, 0)).toEqual(0);
    }

    @Test('isDismissKey matches esc escape and q case-insensitively')
    async isDismissKeyMatches() {
        expect(controller.isDismissKey('esc')).toEqual(true);
        expect(controller.isDismissKey('ESCAPE')).toEqual(true);
        expect(controller.isDismissKey('q')).toEqual(true);
        expect(controller.isDismissKey('enter')).toEqual(false);
        expect(controller.isDismissKey('')).toEqual(false);
    }

    @Test('resolveKey maps arrows enter tab and digits to decisions')
    async resolveKeyMaps() {
        expect(controller.resolveKey('up', 3)).toEqual({ action: 'move', delta: -1 });
        expect(controller.resolveKey('arrowup', 3)).toEqual({ action: 'move', delta: -1 });
        expect(controller.resolveKey('down', 3)).toEqual({ action: 'move', delta: 1 });
        expect(controller.resolveKey('arrowdown', 3)).toEqual({ action: 'move', delta: 1 });
        expect(controller.resolveKey('enter', 3)).toEqual({ action: 'confirm' });
        expect(controller.resolveKey('tab', 3)).toEqual({ action: 'confirm' });
        expect(controller.resolveKey('return', 3)).toEqual({ action: 'confirm' });
        expect(controller.resolveKey('2', 3)).toEqual({ action: 'choose', index: 1 });
        expect(controller.resolveKey('esc', 3)).toEqual({ action: 'escape' });
        expect(controller.resolveKey('q', 3)).toEqual({ action: 'escape' });
        expect(controller.resolveKey('home', 3)).toEqual({ action: 'home' });
        expect(controller.resolveKey('end', 3)).toEqual({ action: 'end' });
        expect(controller.resolveKey('pageup', 3)).toEqual({ action: 'page', direction: -1 });
        expect(controller.resolveKey('pagedown', 3)).toEqual({ action: 'page', direction: 1 });
    }

    @Test('resolveKey returns none for out-of-range digits and unknown keys')
    async resolveKeyOutOfRangeNone() {
        expect(controller.resolveKey('9', 3)).toEqual({ action: 'none' });
        expect(controller.resolveKey('x', 3)).toEqual({ action: 'none' });
        expect(controller.resolveKey('', 3)).toEqual({ action: 'none' });
    }

    @Test('resolveListKey maps list navigation and dismiss keys')
    async resolveListKeyMaps() {
        expect(controller.resolveListKey('up')).toEqual({ action: 'move', delta: -1 });
        expect(controller.resolveListKey('arrowup')).toEqual({ action: 'move', delta: -1 });
        expect(controller.resolveListKey('down')).toEqual({ action: 'move', delta: 1 });
        expect(controller.resolveListKey('arrowdown')).toEqual({ action: 'move', delta: 1 });
        expect(controller.resolveListKey('home')).toEqual({ action: 'home' });
        expect(controller.resolveListKey('end')).toEqual({ action: 'end' });
        expect(controller.resolveListKey('pageup')).toEqual({ action: 'page', direction: -1 });
        expect(controller.resolveListKey('pagedown')).toEqual({ action: 'page', direction: 1 });
        expect(controller.resolveListKey('esc')).toEqual({ action: 'escape' });
        expect(controller.resolveListKey('q')).toEqual({ action: 'escape' });
        expect(controller.resolveListKey('approve')).toEqual({ action: 'none' });
        expect(controller.resolveListKey('copy')).toEqual({ action: 'none' });
    }

    @Test('resolveMenuKey maps menu keys and consumes out-of-range digits')
    async resolveMenuKeyMaps() {
        expect(controller.resolveMenuKey('down', '', 3)).toEqual({ action: 'move', delta: 1 });
        expect(controller.resolveMenuKey('up', '', 3)).toEqual({ action: 'move', delta: -1 });
        expect(controller.resolveMenuKey('return', '', 3)).toEqual({ action: 'accept' });
        expect(controller.resolveMenuKey('tab', '', 3)).toEqual({ action: 'accept' });
        expect(controller.resolveMenuKey('left', '', 3)).toEqual({ action: 'cancel' });
        expect(controller.resolveMenuKey('right', '', 3)).toEqual({ action: 'cancel' });
        expect(controller.resolveMenuKey('esc', '', 3)).toEqual({ action: 'escape' });
        expect(controller.resolveMenuKey('q', '', 3)).toEqual({ action: 'escape' });
        expect(controller.resolveMenuKey('home', '', 3)).toEqual({ action: 'home' });
        expect(controller.resolveMenuKey('end', '', 3)).toEqual({ action: 'end' });
        expect(controller.resolveMenuKey('pageup', '', 3)).toEqual({ action: 'page', direction: -1 });
        expect(controller.resolveMenuKey('pagedown', '', 3)).toEqual({ action: 'page', direction: 1 });
        expect(controller.resolveMenuKey('2', '', 3)).toEqual({ action: 'choose', index: 1 });
        expect(controller.resolveMenuKey('9', '', 3)).toEqual({ action: 'digit-consume' });
        expect(controller.resolveMenuKey('x', '', 3)).toEqual({ action: 'none' });
        expect(controller.resolveMenuKey('', 'down', 3)).toEqual({ action: 'move', delta: 1 });
    }

    @Test('disabled options are reported and enabled-index scanning works')
    async disabledOptionHelpers() {
        expect(controller.isSelectOptionDisabled(option('a'))).toEqual(false);
        expect(controller.isSelectOptionDisabled(option('a', { disabledReason: 'locked' }))).toEqual(true);
        expect(controller.isSelectOptionDisabled(undefined)).toEqual(false);

        const options = [
            option('a', { disabledReason: 'locked' }),
            option('b'),
            option('c', { disabledReason: 'gone' })
        ];
        expect(controller.existsEnabledOption(options, 0, 1)).toEqual(true);
        expect(controller.existsEnabledOption([option('a', { disabledReason: 'locked' })], 0, 1)).toEqual(false);
    }
}

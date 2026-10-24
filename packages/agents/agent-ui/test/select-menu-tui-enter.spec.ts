import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';

/**
 * Real TUI finding: `/model` opened the provider picker, the arrow keys moved
 * the highlight, but Enter did nothing — the menu was stuck until Escape.
 *
 * The TUI decoder batches plain characters into one text run, so a bare Enter
 * arrives as `text: '\r'` with no `controlKey` (arrow keys are ESC sequences
 * and keep theirs). `processDecodedInput` then called the menu handler with an
 * empty key, got no decision, and returned `menuBlocked`, swallowing Enter.
 * These cases exercise the real terminal boundary, not a synthetic
 * `controlKey: 'return'`.
 */
@Suite('TUI select menus accept a bare Enter (no controlKey)')
export class SelectMenuTuiEnterTest {
    @Test('Enter resolves a blocking select menu and keeps the highlighted row')
    async enterResolvesSelectMenu() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        let resolved: string | undefined | 'pending' = 'pending';
        void state.selectAsync('Model providers', [
            { label: 'anthropic', value: '__provider__:anthropic' },
            { label: 'deepseek', value: '__provider__:deepseek' }
        ], 0).then(value => { resolved = value; });
        state.moveSelectMenu(1);

        await (component as any).handleTerminalInput({ text: '\r', partial: false }, '\r');
        await Promise.resolve();

        expect(resolved).toEqual('__provider__:deepseek');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('Enter on the command suggestion still injects arguments instead of running')
    async enterKeepsSmartRun() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.setInput('/model', '/model'.length);
        expect(!!state.selectMenu).toBe(true);

        await (component as any).handleTerminalInput({ text: '\r', partial: false }, '\r');
        await Promise.resolve();

        // `/model` accepts optional arguments, so the first Enter completes the
        // command (smart-run) and a second Enter opens the switcher. The menu
        // must be gone either way — Enter may never be swallowed.
        expect(state.input).toEqual('/model ');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('Tab still completes the highlighted suggestion')
    async tabCompletesSuggestion() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.setInput('/se', '/se'.length);
        const sessionIndex = state.selectMenu!.options.findIndex(option => option.value === '/session');
        expect(sessionIndex >= 0).toBe(true);
        state.setSelectMenuIndex(sessionIndex);

        await (component as any).handleTerminalInput({ text: '\t', partial: false }, '\t');
        await Promise.resolve();

        expect(state.input).toEqual('/session ');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('Enter executes a subcommand/enum argument completion')
    async enterExecutesArgumentCompletion() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        let submits = 0;
        (state as any).submitAction = async () => { submits += 1; };
        state.setInput('/statusline list', '/statusline list'.length);
        // `/statusline` offers `list` as an argument suggestion. Enter used to
        // only close the menu (the typed word was already identical), so the
        // command needed a second Enter to run.
        expect(state.selectMenu?.options.map(option => option.value)).toContain('list');

        await (component as any).handleTerminalInput({ text: '\r', partial: false }, '\r');
        await Promise.resolve();

        expect(submits).toEqual(1);
    }

    @Test('Tab only fills an argument completion without running the command')
    async tabKeepsArgumentCompletionPassive() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        let submits = 0;
        (state as any).submitAction = async () => { submits += 1; };
        state.setInput('/statusline li', '/statusline li'.length);
        expect(state.selectMenu?.options.map(option => option.value)).toContain('list');

        await (component as any).handleTerminalInput({ text: '\t', partial: false }, '\t');
        await Promise.resolve();

        expect(submits).toEqual(0);
        expect(state.input).toEqual('/statusline list ');
    }
}

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

    @Test('Enter executes a command with a meaningful no-argument form')
    async enterExecutesOptionalArgumentCommand() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        let submits = 0;
        (state as any).submitAction = async () => { submits += 1; };
        state.setInput('/model', '/model'.length);
        expect(!!state.selectMenu).toBe(true);

        await (component as any).handleTerminalInput({ text: '\r', partial: false }, '\r');
        await Promise.resolve();

        // `/model` without arguments opens the switcher; the first Enter runs
        // it (smart-run now only waits for commands that require arguments).
        expect(submits).toEqual(1);
        expect(state.input).toEqual('/model ');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('Enter still waits for a command that requires arguments')
    async enterWaitsForRequiredArguments() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        let submits = 0;
        (state as any).submitAction = async () => { submits += 1; };
        state.setInput('/search', '/search'.length);
        expect(!!state.selectMenu).toBe(true);

        await (component as any).handleTerminalInput({ text: '\r', partial: false }, '\r');
        await Promise.resolve();

        expect(submits).toEqual(0);
        expect(state.input).toEqual('/search ');
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

    @Test('a fast double Esc in one read still closes a blocking menu')
    async doubleEscapeClosesMenu() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        let resolved: string | undefined = 'pending';
        void state.selectAsync('Model providers', [
            { label: 'anthropic', value: '__provider__:anthropic' },
            { label: 'deepseek', value: '__provider__:deepseek' }
        ], 0).then(value => { resolved = value; });

        // Two Esc presses coalesce into one alt-esc read; the pager already
        // treats that as close, and menus used to swallow it.
        await (component as any).handleTerminalInput({ text: '\u001b\u001b', partial: false }, '\u001b\u001b');
        await Promise.resolve();

        expect(state.selectMenu).toBeUndefined();
        expect(resolved).toBeUndefined();
    }

    @Test('a fast double Esc in one read closes a focus panel')
    async doubleEscapeClosesFocusPanel() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.openCommandOutputs();
        expect(state.commandOutputsOpen).toBe(true);

        await (component as any).handleTerminalInput({ text: '\u001b\u001b', partial: false }, '\u001b\u001b');
        await Promise.resolve();

        expect(state.commandOutputsOpen).toBe(false);
    }
}

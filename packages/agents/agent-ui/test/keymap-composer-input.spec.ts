import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { AGENT_CONSOLE_GLOBAL_ACTIONS, AgentConsoleKeymap } from '../src/AgentConsoleKeymap';
import { executeGlobalKeyActionView } from '../src/AgentConsoleGlobalKeyInputController';
import { createConsole, SchedulerStub, RuntimeStub } from './_helpers';

function makeState(): AgentConsoleSessionState {
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
}

@Suite('composer Tab completion and Ctrl+U')
export class ComposerKeyTest {

    @Test('Tab re-opens the suggestion menu after Esc closed it')
    async tabReopensMenu() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.setInput('/se', 3);
        state.closeSelectMenu();
        expect(state.selectMenu).toBeUndefined();

        expect((component as any).queueDraft()).toBe(true);
        expect(state.selectMenu?.title).toEqual('Suggestions');
        expect(state.selectMenu?.options.some(option => option.value === '/session')).toBe(true);
    }

    @Test('Tab with an open menu completes the highlighted option')
    async tabCompletesOpenMenu() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.setInput('/se', 3);
        expect(state.selectMenu).toBeDefined();
        // The global Tab handler must not consume the key while the menu is
        // open: completion happens in the menu handler.
        expect((component as any).queueDraft()).toBe(false);
        expect(state.input).toEqual('/se');
    }

    @Test('an open menu completes even while a turn runs (no broken queued draft)')
    async menuCompletionWinsOverQueue() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.setStatus('running');
        state.setInput('/se', 3);
        expect(state.selectMenu).toBeDefined();
        expect((component as any).queueDraft()).toBe(false);

        const result: any = await (state as any).processDecodedInput(
            { text: '\t', controlKey: 'tab', partial: false },
            '\t',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: {
                    move: () => undefined,
                    movePage: () => undefined,
                    selectFirst: () => undefined,
                    selectLast: () => undefined,
                    setFocused: () => undefined
                }
            }
        );
        expect(result.handled).toBe(true);
        expect(state.input.trim()).toEqual('/settings');
        expect(state.queuedPromptCount).toEqual(0);
    }

    @Test('an exact command name still queues with Tab mid-turn')
    async exactCommandStillQueues() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.setStatus('running');
        state.setInput('/compact', '/compact'.length);
        expect(state.selectMenu).toBeDefined();
        // Existing follow-up behaviour: an exact command queues as-is.
        expect((component as any).queueDraft()).toBe(true);
    }

    @Test('Tab with plain text still queues as before')
    async tabQueuesPlainDraft() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        state.setInput('a plain follow-up', 'a plain follow-up'.length);
        // Idle: nothing to queue, nothing to complete.
        expect((component as any).queueDraft()).toBe(false);
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('reopenInputSuggestions only reacts to / and @ tokens')
    async reopenOnlyForTokens() {
        const state = makeState();
        state.setInput('hello @world', 'hello @world'.length);
        // `@world` is a token, but there is no suggestion for it: handled anyway.
        expect(state.reopenInputSuggestions()).toBe(true);
        state.closeSelectMenu();

        state.setInput('plain text', 'plain text'.length);
        expect(state.reopenInputSuggestions()).toBe(false);
    }

    @Test('ctrl+u clears the composer line')
    async ctrlUClearsInput() {
        const keymap = new AgentConsoleKeymap();
        expect(AGENT_CONSOLE_GLOBAL_ACTIONS).toContain('clear-input');
        expect(keymap.effectiveBindings('composer')['ctrl+u']).toEqual('clear-input');
        // The pager keeps its half-page binding.
        expect(keymap.effectiveBindings('pager')['ctrl+u']).toEqual('message-half-page-up');

        const calls: Array<[string, number]> = [];
        const host = {
            state: {
                setInput: (value: string, cursor: number) => { calls.push([value, cursor]); }
            }
        } as any;
        expect(await executeGlobalKeyActionView(host, 'clear-input')).toBe(true);
        expect(calls).toEqual([['', 0]]);
    }
}

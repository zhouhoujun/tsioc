import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { AGENT_CONSOLE_SUGGESTIONS_TITLE } from '../src/AgentConsoleSuggestions';
import { applySelectMenuFilterInput } from '../src/AgentConsoleSelectMenuState';

const OPTIONS = [
    { label: 'gpt-4o', value: 'gpt-4o' },
    { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
    { label: 'deepseek-v4', value: 'deepseek-v4' },
    { label: 'sonnet', value: 'sonnet' }
];

function openModelMenu(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.openSelectMenu('Model', OPTIONS.slice(), 2);
    return state;
}

@Suite('select menu type-to-filter')
export class SelectMenuFilterTest {
    @Test('typing filters options and resets the selection to the first match')
    filters() {
        const state = openModelMenu();
        expect(state.focusLayers.handleMenuInput('', 'gp')).toEqual(true);
        expect(state.selectMenu?.filter).toEqual('gp');
        expect(state.selectMenu?.options.map(option => option.value)).toEqual(['gpt-4o', 'gpt-4o-mini']);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        expect(state.selectedSelectMenuOption?.value).toEqual('gpt-4o');
    }

    @Test('backspace shrinks the filter and restores the full list')
    backspace() {
        const state = openModelMenu();
        state.focusLayers.handleMenuInput('', 'gpt');
        expect(state.selectMenu?.options.length).toEqual(2);
        expect(state.focusLayers.handleMenuInput('backspace', '\b')).toEqual(true);
        expect(state.selectMenu?.filter).toEqual('gp');
        expect(state.focusLayers.handleMenuInput('backspace', '\b')).toEqual(true);
        expect(state.focusLayers.handleMenuInput('backspace', '\b')).toEqual(true);
        expect(state.selectMenu?.filter).toEqual('');
        expect(state.selectMenu?.options.length).toEqual(OPTIONS.length);
        // Backspace on an empty filter falls through so the dialog can handle it.
        expect(state.focusLayers.handleMenuInput('backspace', '\b')).toEqual(false);
    }

    @Test('digits keep numbered selection until a filter is active')
    digits() {
        const state = openModelMenu();
        expect(applySelectMenuFilterInput(state, '2')).toEqual(false);
        state.focusLayers.handleMenuInput('', 'd');
        expect(state.selectMenu?.filter).toEqual('d');
        // `4` is now part of the query (model ids contain digits).
        expect(state.focusLayers.handleMenuInput('', '4')).toEqual(true);
        expect(state.selectMenu?.filter).toEqual('d4');
    }

    @Test('q dismisses only before filtering starts')
    qKeepsDismissMeaning() {
        const state = openModelMenu();
        expect(applySelectMenuFilterInput(state, 'q')).toEqual(false);
        state.focusLayers.handleMenuInput('', 'd');
        expect(state.focusLayers.handleMenuInput('', 'q')).toEqual(true);
        expect(state.selectMenu?.filter).toEqual('dq');
    }

    @Test('enter with zero matches keeps the dialog open')
    async noMatchesStayOpen() {
        const state = openModelMenu();
        state.focusLayers.handleMenuInput('', 'zzz');
        expect(state.selectMenu?.options.length).toEqual(0);
        await state.confirmSelectMenu();
        expect(!!state.selectMenu).toEqual(true);
        expect(state.selectMenu?.filter).toEqual('zzz');
    }

    @Test('palette query history is not a parent chain: esc closes in one press')
    async paletteEscapeCloses() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Command palette: t', OPTIONS.slice(), 0, undefined, 'palette');
        state.openSelectMenu('Command palette: th', OPTIONS.slice(), 0, undefined, 'palette');
        state.openSelectMenu('Command palette: the', OPTIONS.slice(), 0, undefined, 'palette');
        await state.dismissSelectMenuLayer();
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('suggestion menus keep composer filtering untouched')
    suggestionMenusAreNotFiltered() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu(AGENT_CONSOLE_SUGGESTIONS_TITLE, OPTIONS.slice());
        expect(applySelectMenuFilterInput(state, 'gp')).toEqual(false);
        expect(state.selectMenu?.filter).toEqual('');
        expect(state.selectMenu?.options.length).toEqual(OPTIONS.length);
    }
}

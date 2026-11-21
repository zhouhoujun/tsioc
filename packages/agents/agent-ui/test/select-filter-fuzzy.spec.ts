import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { AgentConsoleSelectPanelComponent } from '../src/AgentConsolePanels';
import {
    rankAgentConsoleFuzzyOptions,
    scoreAgentConsoleFuzzyMatch,
    scoreAgentConsoleFuzzyOption
} from '../src/AgentConsoleFuzzy';
import { applySelectMenuFilterInput, setSelectMenuFilter } from '../src/AgentConsoleSelectMenuState';

const THEMES = [
    { label: 'Dark theme', value: 'dark', description: 'default dark palette' },
    { label: 'Light theme', value: 'light', description: 'high contrast daylight palette' },
    { label: 'Solarized', value: 'solarized', description: 'muted solarized palette' }
];

function openThemeMenu(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.openSelectMenu('Theme', THEMES.slice(), 0);
    return state;
}

/**
 * P3 opencode parity: blocking menu filters are search fields. Substring-only
 * matching made `drk`/`thm` report "no results" for lists a user can see.
 */
@Suite('select menu fuzzy filter')
export class SelectMenuFuzzyFilterTest {
    @Test('scores exact > prefix > word start > mid-word > subsequence')
    tiers() {
        expect(scoreAgentConsoleFuzzyMatch('dark', 'dark')).toEqual(0);
        expect(scoreAgentConsoleFuzzyMatch('dark theme', 'dark')).toBeLessThan(200);
        expect(scoreAgentConsoleFuzzyMatch('toggle dark mode', 'dark')).toBeLessThan(300);
        expect(scoreAgentConsoleFuzzyMatch('highlightdark', 'dark')).toBeGreaterThanOrEqual(300);
        expect(scoreAgentConsoleFuzzyMatch('docker risk kit', 'drk')).toBeGreaterThanOrEqual(400);
        expect(scoreAgentConsoleFuzzyMatch('light', 'drk')).toBeUndefined();
    }

    @Test('a label hit outranks a description-only hit')
    optionFields() {
        const byLabel = scoreAgentConsoleFuzzyOption({ label: 'dark', value: 'x' }, 'dark')!;
        const byDescription = scoreAgentConsoleFuzzyOption({ label: 'x', value: 'y', description: 'dark' }, 'dark')!;
        expect(byLabel).toBeLessThan(byDescription);
    }

    @Test('typing a fuzzy acronym keeps the matching row')
    async fuzzyAcronym() {
        const state = openThemeMenu();
        expect(applySelectMenuFilterInput(state, 'd')).toEqual(true);
        expect(applySelectMenuFilterInput(state, 'r')).toEqual(true);
        expect(applySelectMenuFilterInput(state, 'k')).toEqual(true);
        expect(state.selectMenu?.filter).toEqual('drk');
        expect(state.selectMenu?.options.map(option => option.value)).toEqual(['dark']);
        expect(state.selectedSelectMenuOption?.value).toEqual('dark');
    }

    @Test('subsequence matches keep rows the substring filter would drop')
    async subsequenceKeepsRows() {
        const state = openThemeMenu();
        setSelectMenuFilter(state, 'thm');
        expect(state.selectMenu?.options.map(option => option.value)).toEqual(['dark', 'light']);
    }

    @Test('rank keeps equal scores in their original order')
    order() {
        const ranked = rankAgentConsoleFuzzyOptions([
            { label: 'same', value: 'a' },
            { label: 'same', value: 'b' },
            { label: 'same', value: 'c' }
        ], 'same');
        expect(ranked.map(option => option.value)).toEqual(['a', 'b', 'c']);
    }

    @Test('an unmatched filter keeps the full list cached for backspace')
    async restoresAfterBackspace() {
        const state = openThemeMenu();
        setSelectMenuFilter(state, 'zzz');
        expect(state.selectMenu?.options.length).toEqual(0);
        expect(state.selectMenu?.allOptions?.length).toEqual(THEMES.length);
        setSelectMenuFilter(state, '');
        expect(state.selectMenu?.options.map(option => option.value)).toEqual(['dark', 'light', 'solarized']);
    }

    @Test('a zero-match filter renders an explicit empty state')
    emptyState() {
        const state = openThemeMenu();
        setSelectMenuFilter(state, 'zzz');
        const panel = new AgentConsoleSelectPanelComponent(state);
        expect(panel.menuEmptyText).toEqual('No matches for "zzz"');
        // Empty state belongs to blocking menus only; suggestions stay bare.
        state.closeSelectMenu();
        state.openSelectMenu('Suggestions', THEMES.slice(), 0, undefined, 'suggestion');
        setSelectMenuFilter(state, 'zzz');
        expect((new AgentConsoleSelectPanelComponent(state)).menuEmptyText).toEqual('');
    }
}

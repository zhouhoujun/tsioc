import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultInputHistoryController } from '../src';

@Suite('common input history')
export class InputHistoryTest {
    protected state() {
        return {
            input: '',
            inputHistoryEntries: [] as string[],
            inputHistoryIndex: -1,
            inputHistoryDraft: '',
            setInput(value: string) { this.input = value; }
        };
    }

    @Test('navigates recent prompts and restores the original draft')
    navigatesAndRestoresDraft() {
        const state = this.state();
        const history = new DefaultInputHistoryController(state);
        history.push('first');
        history.push('second');
        state.input = 'draft';

        expect(history.navigate(-1)).toBe(true);
        expect(state.input).toBe('second');
        expect(history.navigate(-1)).toBe(true);
        expect(state.input).toBe('first');
        expect(history.navigate(1)).toBe(true);
        expect(state.input).toBe('second');
        expect(history.navigate(1)).toBe(true);
        expect(state.input).toBe('draft');
    }

    @Test('skips slash commands and de-duplicates entries')
    skipsSlashCommands() {
        const state = this.state();
        const history = new DefaultInputHistoryController(state);
        history.push('/help');
        history.push('prompt');
        history.push('prompt');
        expect(history.entries()).toEqual(['prompt']);
        history.replace(['one', '/clear', 'one', 'two']);
        expect(history.entries()).toEqual(['one', 'two']);
    }
}

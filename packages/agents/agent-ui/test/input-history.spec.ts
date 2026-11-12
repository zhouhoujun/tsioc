import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultAgentConsoleInputHistoryController, COMMON_INPUT_HISTORY_LIMIT } from '../src/AgentConsoleInputHistory';

class HistoryState {
    inputHistoryEntries: string[] = [];
    inputHistoryIndex = -1;
    inputHistoryDraft = '';
    input = '';
    setInput(value: string, _cursor?: number): void { this.input = value; }
}

@Suite('agent console input history')
export class AgentConsoleInputHistoryTest {
    @Test('records prompts, navigates and restores the draft')
    navigatesHistory() {
        const state = new HistoryState();
        const history = new DefaultAgentConsoleInputHistoryController(state as any);
        history.push('first');
        history.push('second');
        state.input = 'draft';
        expect(history.navigate(-1)).toEqual(true);
        expect(state.input).toEqual('second');
        expect(history.navigate(-1)).toEqual(true);
        expect(state.input).toEqual('first');
        expect(history.navigate(1)).toEqual(true);
        expect(state.input).toEqual('second');
        expect(history.navigate(1)).toEqual(true);
        expect(state.input).toEqual('draft');
    }

    @Test('caps the stored prompt history')
    capsHistory() {
        const state = new HistoryState();
        const history = new DefaultAgentConsoleInputHistoryController(state as any);
        for (let index = 0; index < COMMON_INPUT_HISTORY_LIMIT + 10; index++) {
            history.push(`prompt-${index}`);
        }
        expect(state.inputHistoryEntries.length).toEqual(COMMON_INPUT_HISTORY_LIMIT);
    }
}

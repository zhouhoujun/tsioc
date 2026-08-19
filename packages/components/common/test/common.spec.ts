import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    formatCommonIndexedOptionLabel,
    processCommonTextInputChunk,
    resolveCommonSelectWindow,
    shouldSkipCommonHistoryEntry
} from '../src';

@Suite('common component utilities')
export class CommonComponentUtilitiesTest {
    @Test('resolves stable select windows')
    selectWindow() {
        expect(resolveCommonSelectWindow(10, 8, 4)).toEqual({ start: 6, count: 4 });
    }

    @Test('formats indexed labels')
    indexedLabel() {
        expect(formatCommonIndexedOptionLabel(1, 'two', true)).toEqual('› 2. two');
    }

    @Test('processes enter actions without platform APIs')
    inputChunk() {
        expect(processCommonTextInputChunk('go', 2, '\r').shouldSubmit).toBeTruthy();
        expect(processCommonTextInputChunk('go', 2, '\r', { hasSelectMenu: true }).shouldConfirmSelection).toBeTruthy();
    }

    @Test('handles backspace delete and cursor sequences')
    textEditing() {
        expect(processCommonTextInputChunk('abcd', 4, '\u007f').value).toEqual('abc');
        expect(processCommonTextInputChunk('abcd', 1, '\u001b[3~').value).toEqual('acd');
        const moved = processCommonTextInputChunk('abcd', 4, '\u001b[D');
        expect(moved.cursor).toEqual(3);
        expect(moved.value).toEqual('abcd');
    }

    @Test('filters command history entries')
    history() {
        expect(shouldSkipCommonHistoryEntry(' /help')).toBeTruthy();
        expect(shouldSkipCommonHistoryEntry('hello')).toBeFalsy();
    }
}

import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    formatCommonIndexedOptionLabel,
    processCommonTextInputChunk,
    resolveCommonSelectWindow,
    shouldSkipCommonHistoryEntry,
    shouldSubmitCommonTextInputChunk
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

    @Test('only bare trailing-newline chunks submit on enter')
    submitDetection() {
        // Embedded newlines must not submit (multi-line paste).
        expect(shouldSubmitCommonTextInputChunk('first\nsecond')).toBeFalsy();
        expect(shouldSubmitCommonTextInputChunk('first\r\nsecond')).toBeFalsy();
        expect(shouldSubmitCommonTextInputChunk('first\nsecond\n')).toBeFalsy();
        // A bare Enter (or a line followed by Enter) submits.
        expect(shouldSubmitCommonTextInputChunk('\r')).toBeTruthy();
        expect(shouldSubmitCommonTextInputChunk('\n')).toBeTruthy();
        expect(shouldSubmitCommonTextInputChunk('text\n')).toBeTruthy();
        expect(shouldSubmitCommonTextInputChunk('text\r')).toBeTruthy();
        // Empty / no-newline / alt-enter chunks never submit on enter.
        expect(shouldSubmitCommonTextInputChunk('')).toBeFalsy();
        expect(shouldSubmitCommonTextInputChunk('\u001b\r')).toBeFalsy();
        expect(shouldSubmitCommonTextInputChunk('\u001b\n')).toBeFalsy();
    }

    @Test('preserves multi-line paste newlines instead of joining them')
    multilinePaste() {
        const pasted = processCommonTextInputChunk('', 0, 'line1\nline2', { submitOnEnter: false });
        expect(pasted.value).toEqual('line1\nline2');
        expect(pasted.shouldSubmit).toBeFalsy();

        // A plain Enter still submits and is not inserted into the value.
        const entered = processCommonTextInputChunk('go', 2, '\r', { submitOnEnter: true });
        expect(entered.value).toEqual('go');
        expect(entered.shouldSubmit).toBeTruthy();
    }
}

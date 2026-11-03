import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    DialogComponent,
    ListPanelComponent,
    SelectComponent,
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

    @Test('consumes batched escape sequences without leaking literal bytes')
    batchedEscapeSequences() {
        expect(processCommonTextInputChunk('', 0, '\u001b[A\u001b[A\u001b[A')).toEqual({
            value: '',
            cursor: 0,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });
        expect(processCommonTextInputChunk('', 0, '\u001b[5~\u001b[5~')).toEqual({
            value: '',
            cursor: 0,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });
        expect(processCommonTextInputChunk('abc', 3, '\u001b[D\u001b[D')).toEqual({
            value: 'abc',
            cursor: 1,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });
        expect(processCommonTextInputChunk('', 0, 'ab\u001b[Ac\u001b[A').value).toEqual('abc');
    }

    @Test('filters command history entries')
    history() {
        expect(shouldSkipCommonHistoryEntry(' /help')).toBeTruthy();
        expect(shouldSkipCommonHistoryEntry('hello')).toBeFalsy();
    }

    @Test('sizes dialog chrome from content and bounds')
    dialogContentWidth() {
        const dialog = new DialogComponent();
        const maxWidth = () => String((dialog.resolvedShellStyle as Record<string, string>)['max-width']);
        dialog.lines = ['█'.repeat(33)];
        dialog.title = 'pairing 19 lines · 1-19';
        expect(maxWidth()).toBe('39ch');

        dialog.lines = ['short'];
        dialog.title = '';
        expect(maxWidth()).toBe('24ch');

        dialog.lines = ['x'.repeat(200)];
        expect(maxWidth()).toBe('88ch');

        dialog.shellStyle = 'background: #000;';
        expect(dialog.resolvedShellStyle).toContain('background: #000; max-width: 88ch;');
    }

    @Test('select shell forwards selection, close and key events')
    selectShellEvents() {
        const select = new SelectComponent();
        select.options = [
            { label: 'one', value: '1' },
            { label: 'two', value: '2' }
        ];
        const selected: string[] = [];
        let closed = 0;
        let key = '';
        select.selectAction = value => selected.push(value);
        select.closeAction = () => { closed += 1; };
        select.keydownAction = event => { key = event.key; };
        select.emitSelection({ optionIndex: 1 });
        select.emitSelection({ optionIndex: 99 });
        select.close();
        select.emitKeydown({ key: 'Escape' } as KeyboardEvent);
        expect(selected).toEqual(['2']);
        expect(closed).toEqual(1);
        expect(key).toEqual('Escape');
        expect(select.optionsJson).toContain('"value":"1"');
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

    @Test('list panel forwards row selection and close')
    listPanelEvents() {
        const panel = new ListPanelComponent();
        panel.items = [{ id: 'row-1', label: 'one', selected: 'true' }];
        let selected = '';
        let closed = 0;
        panel.selectAction = value => { selected = value; };
        panel.closeAction = () => { closed += 1; };
        panel.selectItem(panel.items[0]);
        panel.close();
        expect(selected).toEqual('row-1');
        expect(closed).toEqual(1);
    }
}

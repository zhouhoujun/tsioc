import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    DetailPanelComponent,
    DialogComponent,
    InputFieldComponent,
    ListPanelComponent,
    MessageRowComponent,
    SelectComponent,
    fillTemplate,
    formatIndexedOptionLabel,
    nextWordEnd,
    previousWordStart,
    processTextInputChunk,
    resolveSelectWindow,
    shouldSkipHistoryEntry,
    shouldSubmitTextInputChunk,
    truncateByDisplayWidth
} from '../src';

@Suite('common component utilities')
export class ComponentUtilitiesTest {
    @Test('resolves stable select windows')
    selectWindow() {
        expect(resolveSelectWindow(10, 8, 4)).toEqual({ start: 6, count: 4 });
    }


    @Test('fills placeholder templates without touching unknown keys')
    fillTemplate() {
        expect(fillTemplate('{count} files in {name}', { count: 2, name: 'src' })).toEqual('2 files in src');
        expect(fillTemplate('{count} / {missing}', { count: 1 })).toEqual('1 / {missing}');
    }

    @Test('truncates by display width with an ellipsis')
    truncateText() {
        expect(truncateByDisplayWidth('hello', 10)).toEqual('hello');
        expect(truncateByDisplayWidth('hello world', 8)).toEqual('hello w…');
        expect(truncateByDisplayWidth('你好世界', 5)).toEqual('你好…');
        expect(truncateByDisplayWidth('hello', 0)).toEqual('');
    }

    @Test('formats indexed labels')
    indexedLabel() {
        expect(formatIndexedOptionLabel(1, 'two', true)).toEqual('› 2. two');
    }

    @Test('processes enter actions without platform APIs')
    inputChunk() {
        expect(processTextInputChunk('go', 2, '\r').shouldSubmit).toBeTruthy();
        expect(processTextInputChunk('go', 2, '\r', { hasSelectMenu: true }).shouldConfirmSelection).toBeTruthy();
    }

    @Test('handles backspace delete and cursor sequences')
    textEditing() {
        expect(processTextInputChunk('abcd', 4, '\u007f').value).toEqual('abc');
        expect(processTextInputChunk('abcd', 1, '\u001b[3~').value).toEqual('acd');
        const moved = processTextInputChunk('abcd', 4, '\u001b[D');
        expect(moved.cursor).toEqual(3);
        expect(moved.value).toEqual('abcd');
    }

    @Test('supports readline editing keys and grapheme deletion')
    readlineEditing() {
        expect(processTextInputChunk('abcd', 4, '\u0001').cursor).toEqual(0);
        expect(processTextInputChunk('abcd', 0, '\u0005').cursor).toEqual(4);
        expect(processTextInputChunk('abcd', 2, '\u000b').value).toEqual('ab');
        const killStart = processTextInputChunk('abcd', 2, '\u0015');
        expect(killStart.value).toEqual('cd');
        expect(killStart.cursor).toEqual(0);
        expect(processTextInputChunk('alpha beta', 10, '\u0017').value).toEqual('alpha ');
        expect(processTextInputChunk('alpha beta', 10, '\u001b\u007f').value).toEqual('alpha ');
        const emoji = processTextInputChunk('a\u{1F600}', 3, '\u007f');
        expect(emoji.value).toEqual('a');
        expect(emoji.cursor).toEqual(1);
        expect(processTextInputChunk('a\u{1F600}b', 1, '\u001b[3~').value).toEqual('ab');
    }

    @Test('resolves word boundaries for composer navigation')
    wordBoundaries() {
        expect(previousWordStart('alpha beta', 10)).toEqual(6);
        expect(previousWordStart('alpha beta  ', 12)).toEqual(6);
        expect(nextWordEnd('alpha beta', 0)).toEqual(5);
        expect(nextWordEnd('alpha   beta', 5)).toEqual(12);
    }

    @Test('consumes batched escape sequences without leaking literal bytes')
    batchedEscapeSequences() {
        expect(processTextInputChunk('', 0, '\u001b[A\u001b[A\u001b[A')).toEqual({
            value: '',
            cursor: 0,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });
        expect(processTextInputChunk('', 0, '\u001b[5~\u001b[5~')).toEqual({
            value: '',
            cursor: 0,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });
        expect(processTextInputChunk('abc', 3, '\u001b[D\u001b[D')).toEqual({
            value: 'abc',
            cursor: 1,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });
        expect(processTextInputChunk('', 0, 'ab\u001b[Ac\u001b[A').value).toEqual('abc');
    }

    @Test('filters command history entries')
    history() {
        expect(shouldSkipHistoryEntry(' /help')).toBeTruthy();
        expect(shouldSkipHistoryEntry('hello')).toBeFalsy();
    }

    @Test('sizes dialog chrome from content and bounds')
    dialogContentWidth() {
        const dialog = new DialogComponent();
        const maxWidth = () => String(dialog.resolvedShellStyle).match(/max-width:\s*([^;]+)/)?.[1] || '';
        dialog.lines = ['█'.repeat(33)];
        dialog.title = 'pairing 19 lines · 1-19';
        expect(maxWidth()).toBe('39ch');

        dialog.lines = ['short'];
        dialog.title = '';
        expect(maxWidth()).toBe('24ch');

        dialog.lines = ['x'.repeat(200)];
        expect(maxWidth()).toBe('88ch');
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
        expect(shouldSubmitTextInputChunk('first\nsecond')).toBeFalsy();
        expect(shouldSubmitTextInputChunk('first\r\nsecond')).toBeFalsy();
        expect(shouldSubmitTextInputChunk('first\nsecond\n')).toBeFalsy();
        // A bare Enter (or a line followed by Enter) submits.
        expect(shouldSubmitTextInputChunk('\r')).toBeTruthy();
        expect(shouldSubmitTextInputChunk('\n')).toBeTruthy();
        expect(shouldSubmitTextInputChunk('text\n')).toBeTruthy();
        expect(shouldSubmitTextInputChunk('text\r')).toBeTruthy();
        // Empty / no-newline / alt-enter chunks never submit on enter.
        expect(shouldSubmitTextInputChunk('')).toBeFalsy();
        expect(shouldSubmitTextInputChunk('\u001b\r')).toBeFalsy();
        expect(shouldSubmitTextInputChunk('\u001b\n')).toBeFalsy();
    }

    @Test('preserves multi-line paste newlines instead of joining them')
    multilinePaste() {
        const pasted = processTextInputChunk('', 0, 'line1\nline2', { submitOnEnter: false });
        expect(pasted.value).toEqual('line1\nline2');
        expect(pasted.shouldSubmit).toBeFalsy();

        // A plain Enter still submits and is not inserted into the value.
        const entered = processTextInputChunk('go', 2, '\r', { submitOnEnter: true });
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

    @Test('message row forwards toggle action and keeps token text')
    messageRowToggle() {
        const row = new MessageRowComponent();
        row.tokens = [{ text: 'hello' }, { text: ' world' }];
        row.toggleContent = '…';
        let toggled = 0;
        row.toggleAction = () => { toggled += 1; };
        row.toggle();
        expect(toggled).toEqual(1);
        expect(row.tokens.map(token => token.text).join('')).toEqual('hello world');
    }

    @Test('detail panel keeps numbered rows and summary')
    detailPanelRows() {
        const panel = new DetailPanelComponent();
        panel.summary = 'summary';
        panel.items = [
            { lineNumber: '  1| ', text: 'first' },
            { lineNumber: '  2| ', text: 'second' }
        ];
        expect(panel.summary).toEqual('summary');
        expect(panel.items.map(item => `${item.lineNumber}${item.text}`)).toEqual(['  1| first', '  2| second']);
    }

    @Test('input field forwards editing events')
    inputFieldEvents() {
        const field = new InputFieldComponent();
        field.value = 'draft';
        let input = 0;
        let cursor = 0;
        let key = '';
        field.inputAction = () => { input += 1; };
        field.cursorAction = () => { cursor += 1; };
        field.keydownAction = event => { key = event.key; };
        field.emitInput({} as Event);
        field.emitCursor({} as Event);
        field.emitKeydown({ key: 'Enter' } as KeyboardEvent);
        expect(field.value).toEqual('draft');
        expect(input).toEqual(1);
        expect(cursor).toEqual(1);
        expect(key).toEqual('Enter');
    }
}

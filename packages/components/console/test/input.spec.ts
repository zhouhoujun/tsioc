import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    applyConsoleTextInputChunk,
    clampConsoleSelectIndex,
    clampConsoleTextCursor,
    formatConsoleIndexedOptionLabel,
    isConsolePlaceholderActive,
    processConsoleTextInputChunk,
    resolveConsoleRawKeypressSuppressionKey,
    resolveConsolePlaceholderDisplayValue,
    resolveConsoleListWindow,
    resolveConsoleSelectDetailLines,
    resolveConsoleEnterAction,
    resolveConsoleSelectWindow,
    shouldPlaceConsoleCursor,
    shouldRenderConsoleTranscript,
    shouldRouteConsoleDraftNavigation,
    shouldSuppressConsoleDuplicatedKeypress,
    shouldSubmitConsoleTextChunk,
    syncConsoleEditableElement
} from '../src';

@Suite('Console input')
export class ConsoleInputTest {
    @Test('clamps text cursor into valid bounds')
    clampsTextCursor() {
        expect(clampConsoleTextCursor('hello', -1)).toBe(0);
        expect(clampConsoleTextCursor('hello', 2)).toBe(2);
        expect(clampConsoleTextCursor('hello', 99)).toBe(5);
        expect(clampConsoleTextCursor('', 3)).toBe(0);
    }

    @Test('applies insertions and cursor navigation from terminal chunks')
    appliesInsertionsAndNavigation() {
        let state = applyConsoleTextInputChunk('', 0, 'hello');
        expect(state).toEqual({ value: 'hello', cursor: 5 });

        state = applyConsoleTextInputChunk(state.value, state.cursor, '\u001b[D');
        expect(state).toEqual({ value: 'hello', cursor: 4 });

        state = applyConsoleTextInputChunk(state.value, state.cursor, 'X');
        expect(state).toEqual({ value: 'hellXo', cursor: 5 });

        state = applyConsoleTextInputChunk(state.value, state.cursor, '\u001b[H');
        expect(state.cursor).toBe(0);

        state = applyConsoleTextInputChunk(state.value, state.cursor, '>');
        expect(state).toEqual({ value: '>hellXo', cursor: 1 });

        state = applyConsoleTextInputChunk(state.value, state.cursor, '\u001b[F');
        expect(state.cursor).toBe(state.value.length);
    }

    @Test('applies backspace and delete sequences')
    appliesBackspaceAndDelete() {
        let state = applyConsoleTextInputChunk('abcdef', 3, '\u007f');
        expect(state).toEqual({ value: 'abdef', cursor: 2 });

        state = applyConsoleTextInputChunk('abcdef', 2, '\u001b[3~');
        expect(state).toEqual({ value: 'abdef', cursor: 2 });

        state = applyConsoleTextInputChunk('abcdef', 0, '\b');
        expect(state).toEqual({ value: 'abcdef', cursor: 0 });
    }

    @Test('ignores tabs mouse events and unsupported control bytes')
    ignoresUnsupportedControlInput() {
        expect(applyConsoleTextInputChunk('ab', 2, '\t')).toEqual({ value: 'ab', cursor: 2 });
        expect(applyConsoleTextInputChunk('ab', 2, '\u0001')).toEqual({ value: 'ab', cursor: 2 });
        expect(applyConsoleTextInputChunk('ab', 1, '\u001b[<0;10;5M')).toEqual({ value: 'ab', cursor: 1 });
    }

    @Test('syncs editable elements including selection for focused textarea')
    syncsEditableElements() {
        let focused = 0;
        let blurred = 0;
        const ownerDocument: any = {
            activeElement: null
        };
        const element: any = {
            value: '',
            textContent: '',
            tagName: 'TEXTAREA',
            ownerDocument,
            selectionStart: 0,
            selectionEnd: 0,
            focus() {
                focused += 1;
                ownerDocument.activeElement = this;
            },
            blur() {
                blurred += 1;
                ownerDocument.activeElement = null;
            },
            setSelectionRange(start: number, end: number) {
                this.selectionStart = start;
                this.selectionEnd = end;
            }
        };

        syncConsoleEditableElement(element, {
            value: 'hello',
            cursor: 3,
            focused: true
        });

        expect(element.value).toBe('hello');
        expect(element.textContent).toBe('hello');
        expect(element.selectionStart).toBe(3);
        expect(element.selectionEnd).toBe(3);
        expect(focused).toBe(1);
        expect(ownerDocument.activeElement).toBe(element);

        syncConsoleEditableElement(element, {
            value: 'world',
            cursor: 1,
            focused: false
        });

        expect(element.value).toBe('world');
        expect(element.textContent).toBe('world');
        expect(element.selectionStart).toBe(3);
        expect(element.selectionEnd).toBe(3);
        expect(blurred).toBe(1);
        expect(ownerDocument.activeElement).toBe(null);
    }

    @Test('resolves enter actions from the base console layer')
    resolvesEnterActions() {
        expect(resolveConsoleEnterAction()).toBe('submit');
        expect(resolveConsoleEnterAction({ ctrlKey: true })).toBe('newline');
        expect(resolveConsoleEnterAction({ altKey: true })).toBe('newline');
        expect(resolveConsoleEnterAction({ hasSelectMenu: true })).toBe('confirm-selection');
    }

    @Test('detects submit intent from raw console text chunks')
    detectsSubmitIntentFromRawChunks() {
        expect(shouldSubmitConsoleTextChunk('\r')).toBe(true);
        expect(shouldSubmitConsoleTextChunk('/exit\r')).toBe(true);
        expect(shouldSubmitConsoleTextChunk('/help\r\n')).toBe(true);
        expect(shouldSubmitConsoleTextChunk('\u001b\r')).toBe(false);
        expect(shouldSubmitConsoleTextChunk('first\nsecond')).toBe(false);
        expect(shouldSubmitConsoleTextChunk('first\nsecond\n')).toBe(false);
    }

    @Test('resolves shared select helpers')
    resolvesSharedSelectHelpers() {
        expect(clampConsoleSelectIndex(0, 4)).toBe(0);
        expect(clampConsoleSelectIndex(4, 9)).toBe(3);
        expect(resolveConsoleSelectWindow(8, 4, 3)).toEqual({ start: 3, count: 3 });
        expect(resolveConsoleSelectWindow(2, 0, 6)).toEqual({ start: 0, count: 2 });
        expect(resolveConsoleListWindow(7, 5, 4)).toEqual({ start: 3, count: 4 });
        expect(resolveConsoleSelectDetailLines({
            label: '/model',
            value: '/model',
            detail: 'line1\nline2'
        })).toEqual(['line1', 'line2']);
        expect(resolveConsoleSelectDetailLines({
            label: '/model',
            value: '/model',
            description: 'fallback'
        })).toEqual(['fallback']);
        expect(formatConsoleIndexedOptionLabel(1, '/messages', true)).toBe('› 2. /messages');
        expect(isConsolePlaceholderActive('', 'Ask code or files')).toBe(true);
        expect(resolveConsolePlaceholderDisplayValue('', 'Ask code or files', true)).toBe(' Ask code or files');
        expect(resolveConsolePlaceholderDisplayValue('', 'Ask code or files', false)).toBe('Ask code or files');
    }

    @Test('resolves shared console cursor navigation and transcript visibility rules')
    resolvesSharedConsoleInteractionRules() {
        expect(shouldPlaceConsoleCursor({
            isTTY: true,
            isSelecting: false,
            hasBlockingSelectMenu: false,
            inputLocked: true,
            modalPromptActive: true,
            hasActiveTextPrompt: true,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false
        })).toBe(true);

        expect(shouldPlaceConsoleCursor({
            isTTY: true,
            isSelecting: false,
            hasBlockingSelectMenu: false,
            inputLocked: false,
            modalPromptActive: false,
            hasActiveTextPrompt: false,
            hasSessionFocus: true,
            hasMessageFocus: false,
            hasMessageDetailFocus: false
        })).toBe(false);

        expect(shouldRouteConsoleDraftNavigation({
            hasBlockingSelectMenu: false,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false,
            inputLocked: false,
            modalPromptActive: false,
            hasActiveTextPrompt: false
        })).toBe(true);

        expect(shouldRouteConsoleDraftNavigation({
            hasBlockingSelectMenu: true,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false,
            inputLocked: false,
            modalPromptActive: false,
            hasActiveTextPrompt: false
        })).toBe(false);

        expect(shouldRenderConsoleTranscript({
            showingExitFrame: false,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false
        })).toBe(true);

        expect(shouldRenderConsoleTranscript({
            showingExitFrame: false,
            hasSessionFocus: false,
            hasMessageFocus: true,
            hasMessageDetailFocus: false
        })).toBe(false);
    }

    @Test('suppresses duplicated console keypress events through shared helpers')
    suppressesDuplicatedConsoleKeypresses() {
        const now = Date.now();
        expect(shouldSuppressConsoleDuplicatedKeypress({
            lastRawKey: 'down',
            lastRawAt: now,
            now: now + 10,
            keyName: 'down'
        })).toBe(true);

        expect(shouldSuppressConsoleDuplicatedKeypress({
            lastRawKey: 'digit',
            lastRawAt: now,
            now: now + 10,
            text: '2'
        })).toBe(true);

        expect(shouldSuppressConsoleDuplicatedKeypress({
            lastRawKey: 'down',
            lastRawAt: now,
            now: now + 60,
            keyName: 'down'
        })).toBe(false);

        expect(resolveConsoleRawKeypressSuppressionKey({
            rawText: '/help\r',
            submitTriggered: true
        })).toBe('return');

        expect(resolveConsoleRawKeypressSuppressionKey({
            rawText: '2',
            menuKey: '2'
        })).toBe('digit');

        expect(resolveConsoleRawKeypressSuppressionKey({
            rawText: '\u001b[B',
            controlKey: 'down'
        })).toBe('down');
    }

    @Test('processes console text chunks with submit confirm and newline intents')
    processesConsoleTextChunks() {
        expect(processConsoleTextInputChunk('/help', 5, '\r')).toEqual({
            value: '/help',
            cursor: 5,
            shouldSubmit: true,
            shouldConfirmSelection: false
        });

        expect(processConsoleTextInputChunk('/he', 3, '\r', {
            hasSelectMenu: true
        })).toEqual({
            value: '/he',
            cursor: 3,
            shouldSubmit: false,
            shouldConfirmSelection: true
        });

        expect(processConsoleTextInputChunk('line', 4, '\r', {
            ctrlKey: true,
            submitOnEnter: false
        })).toEqual({
            value: 'line\n',
            cursor: 5,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });

        expect(processConsoleTextInputChunk('line', 4, '\u001b\r', {
            submitOnEnter: false
        })).toEqual({
            value: 'line\n',
            cursor: 5,
            shouldSubmit: false,
            shouldConfirmSelection: false
        });
    }
}

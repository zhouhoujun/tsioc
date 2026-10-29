import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { handleTerminalInputView } from '../src/AgentConsoleTerminalInputController';

/**
 * The terminal decoder splits Enter/Tab that arrive in the same read as their
 * text (`/se\r`). The controller must apply only the decoded item: passing the
 * raw chunk re-inserted the trailing newline (`/se\n`), so the `/` menu never
 * opened and the raw prefix was submitted (`Ambiguous command: /se`).
 */
@Suite('terminal input split keys')
export class TerminalInputSplitTest {

    @Test('a split text item is applied without the trailing Enter')
    async appliesDecodedTextOnly() {
        const applied: string[] = [];
        const host: any = {
            closing: false,
            translator: null,
            state: {
                vimMode: false,
                selectMenu: undefined,
                consoleOptions: {},
                focusLayers: { isAnyFocusActive: () => false },
                async processDecodedInput() {
                    return { handled: true, action: 'textInput', value: '/se' };
                },
                async processRawChunk(chunk: string) {
                    applied.push(chunk);
                    return { submitted: false, confirmedSelection: false };
                }
            },
            getTerminalRenderedLines: () => [],
            focusComposer: () => undefined,
            async handleGlobalKeyInput() {
                return false;
            }
        };
        await handleTerminalInputView(host, { text: '/se', partial: false } as any, '/se\r' as any);
        expect(applied).toEqual(['/se']);
    }

    @Test('a state-applied text run is not inserted twice')
    async appliedTextRunNotDoubled() {
        const applied: string[] = [];
        const host: any = {
            closing: false,
            translator: null,
            state: {
                vimMode: false,
                selectMenu: undefined,
                consoleOptions: {},
                focusLayers: { isAnyFocusActive: () => false },
                async processDecodedInput() {
                    return { handled: true, action: 'textInputApplied', value: 'gamma' };
                },
                async processRawChunk(chunk: string) {
                    applied.push(chunk);
                    return { submitted: false, confirmedSelection: false };
                }
            },
            getTerminalRenderedLines: () => [],
            async handleGlobalKeyInput() {
                return false;
            }
        };
        // Pending-question custom answers already update the draft inside
        // processDecodedInput; re-applying the decoded run doubled it.
        await handleTerminalInputView(host, { text: 'gamma', partial: false } as any, 'gamma' as any);
        expect(applied).toEqual([]);
    }

    @Test('a split Enter item submits the draft')
    async splitEnterSubmits() {
        let submitted = 0;
        const host: any = {
            closing: false,
            translator: null,
            state: {
                vimMode: false,
                selectMenu: undefined,
                consoleOptions: {},
                focusLayers: { isAnyFocusActive: () => false },
                async processDecodedInput() {
                    return { handled: true, action: 'submit' };
                },
                async processRawChunk() {
                    return { submitted: false, confirmedSelection: false };
                }
            },
            async submit() {
                submitted += 1;
            },
            getTerminalRenderedLines: () => [],
            async handleGlobalKeyInput() {
                return false;
            }
        };
        await handleTerminalInputView(host, { text: '\r', controlKey: 'return', partial: false } as any, '/se\r' as any);
        expect(submitted).toEqual(1);
    }
}

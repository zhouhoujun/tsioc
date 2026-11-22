import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { handlePair } from '../src/AgentConsoleSessionRenameCommands';

@Suite('pairing overlay')
export class PairingOverlayTest {
    @Test('a tall overlay shows every line (the pairing QR must not be clipped)')
    showsAllLines() {
        const state = new AgentConsoleSessionState();
        const lines = Array.from({ length: 22 }, (_, index) => `line-${index}`);
        state.openTextOverlay('pairing', lines, lines.length);
        expect(state.textOverlayVisibleLines).toEqual(lines);
        state.scrollTextOverlay(1);
        expect(state.textOverlay!.scroll).toEqual(0);

        state.closeTextOverlay();
        state.openTextOverlay('notice', lines);
        expect(state.textOverlayVisibleLines.length).toEqual(8);
        state.scrollTextOverlayToEdge('end');
        expect(state.textOverlay!.scroll).toEqual(14);
    }

    @Test('/pair opens a full-height overlay with both links and the QR')
    async pairOpensFullOverlay() {
        const captured: any = {};
        const ctx: any = {
            translator: null,
            notify: () => { throw new Error('/pair must not use the clipped notice slot'); },
            state: {
                pairAction: async () => ({
                    urls: ['http://127.0.0.1:3100/?pair=abc', 'http://192.168.1.5:3100/?pair=abc'],
                    qr: 'QR-BLOCK',
                    expiresAt: Date.now() + 5 * 60_000
                }),
                openTextOverlay: (title: string, lines: string[], visibleLines?: number) => {
                    captured.title = title;
                    captured.lines = lines;
                    captured.visibleLines = visibleLines;
                }
            }
        };
        expect(await handlePair(ctx, '', { command: '/pair', matches: [] })).toEqual(true);
        expect(captured.title.toLowerCase()).toContain('pair');
        expect(captured.lines.join('\n')).toContain('192.168.1.5');
        expect(captured.lines.join('\n')).toContain('QR-BLOCK');
        expect(captured.visibleLines).toEqual(captured.lines.length);
    }

    @Test('/pair prints the browser links into the timeline when the host has no QR')
    async pairAppendsToTimeline() {
        const appended: any[] = [];
        const ctx: any = {
            translator: null,
            notify: () => { throw new Error('browser /pair must print to the transcript'); },
            state: {
                pairAction: async () => ({
                    urls: ['http://127.0.0.1:3100/?pair=abc', 'http://192.168.1.5:3100/?pair=abc'],
                    expiresAt: Date.now() + 5 * 60_000
                }),
                appendMessage: (message: any) => appended.push(message),
                openTextOverlay: () => { throw new Error('browser /pair must not open a dialog'); }
            }
        };
        expect(await handlePair(ctx, '', { command: '/pair', matches: [] })).toEqual(true);
        expect(appended.length).toEqual(1);
        expect(appended[0].role).toEqual('system');
        expect(appended[0].content).toContain('192.168.1.5');
        expect(appended[0].content).toContain('One-time link');
        expect(appended[0].metadata?.uiKind).toEqual('pairing');
    }
}

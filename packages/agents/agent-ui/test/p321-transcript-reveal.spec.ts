import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { resolveMessageRowOffset } from '../src/AgentConsoleTranscriptLayout';
import { DefaultAgentConsoleTranscriptNavigationController } from '../src/AgentConsoleTranscriptNavigation';
import { AgentConsoleSessionState } from '../src';

/**
 * Moving the message selection must bring the highlighted message into view.
 * The panel exposes the rendered row offset (item lines + spacer rows) and the
 * navigation asks the host to scroll the platform surface to that row.
 */
@Suite('transcript row offset + reveal (P321)')
export class TranscriptRowOffsetTest {
    @Test('offset counts item lines and spacer rows before the message')
    async offset() {
        const items = [
            { lines: [{ messageId: 'm1' }, { messageId: 'm1' }], spacerBefore: false },
            { lines: [{ messageId: 'm2' }, { messageId: 'm2' }, { messageId: 'm2' }], spacerBefore: true },
            { lines: [{ messageId: 'm3' }], spacerBefore: false }
        ];
        expect(resolveMessageRowOffset(items, 'm1')).toEqual(0);
        expect(resolveMessageRowOffset(items, 'm2')).toEqual(3);
        expect(resolveMessageRowOffset(items, 'm3')).toEqual(6);
        expect(resolveMessageRowOffset(items, 'nope')).toBeUndefined();
    }

    @Test('selecting a message asks the host to reveal it')
    async selectReveals() {
        const revealed: string[] = [];
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any
        ]);
        const navigation = new DefaultAgentConsoleTranscriptNavigationController(state, (id) => { revealed.push(id); return true; });
        navigation.selectLast();
        expect(revealed).toEqual(['m2']);
    }
}

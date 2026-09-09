import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { normalizeThreadItemEvent, THREAD_ITEM_PREVIEW_LINES, ThreadItemEvent } from '../src/ui/ThreadItemProjection';
import { normalizeCommandExchangeEnvelope, CommandExchangeEnvelope } from '../src/ui/CommandExchangeEvent';

@Suite('AgentExchangeEnvelope unification (v19-B1 / v19-C1)')
export class AgentExchangeEnvelopeSpec {
    @Test('ThreadItemEvent and CommandExchangeEnvelope normalize key/content consistently')
    unifyNormalization() {
        const thread: ThreadItemEvent = {
            kind: 'tool',
            key: '  tool:abc  ',
            content: '  output  ',
            sequence: 3,
            outputIds: ['o1', 'o2']
        } as ThreadItemEvent;
        const normalizedThread = normalizeThreadItemEvent(thread);
        expect(normalizedThread.key).toBe('tool:abc');
        expect(normalizedThread.content).toBe('output');
        expect(normalizedThread.sequence).toBe(3);
        expect(normalizedThread.outputIds).toEqual(['o1', 'o2']);

        const envelope: CommandExchangeEnvelope = {
            kind: 'tool',
            key: '  tool:abc  ',
            content: '  output  ',
            sequence: NaN,
            sessionEpoch: NaN,
            outputIds: ['o1']
        } as CommandExchangeEnvelope;
        const normalizedEnvelope = normalizeCommandExchangeEnvelope(envelope);
        expect(normalizedEnvelope.key).toBe('tool:abc');
        expect(normalizedEnvelope.content).toBe('output');
        expect(normalizedEnvelope.sequence).toBe(0);
        expect(normalizedEnvelope.sessionEpoch).toBe(0);
    }

    @Test('shared display budget defines cross-platform collapse constants (v19-C1)')
    displayBudget() {
        expect(THREAD_ITEM_PREVIEW_LINES.auxiliary).toBe(8);
        expect(THREAD_ITEM_PREVIEW_LINES.reasoning).toBe(4);
        expect(THREAD_ITEM_PREVIEW_LINES.questionTailVisible).toBe(6);
    }
}

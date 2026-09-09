import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { normalizeThreadItemEvent, THREAD_ITEM_PREVIEW_LINES, ThreadItemEvent } from '../src/ui/ThreadItemProjection';
import { normalizeCommandExchangeEnvelope, CommandExchangeEnvelope, parseCommandExchangeRecord } from '../src/ui/CommandExchangeEvent';

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

    @Test('parseCommandExchangeRecord coerces an untrusted payload into a durable record (v19-B2)')
    parseRecord() {
        const record = parseCommandExchangeRecord('s1', {
            sessionEpoch: '7',
            kind: 'tool',
            key: 'tool:abc',
            content: 'output',
            sequence: '3',
            attempt: '2',
            receipt: 'rcpt',
            requestId: 'req-1',
            status: 'success',
            durationMs: '120',
            toolCallId: 'tc-1',
            command: 'ls',
            args: '-la',
            outputIds: ['o1', 'o2'],
            error: 'boom',
            retryable: 'true',
            source: 'remote',
            timestamp: '123'
        });
        expect(record.sessionId).toBe('s1');
        expect(record.sessionEpoch).toBe(7);
        expect(record.kind).toBe('tool');
        expect(record.key).toBe('tool:abc');
        expect(record.content).toBe('output');
        expect(record.sequence).toBe(3);
        expect(record.attempt).toBe(2);
        expect(record.receipt).toBe('rcpt');
        expect(record.requestId).toBe('req-1');
        expect(record.status).toBe('success');
        expect(record.durationMs).toBe(120);
        expect(record.toolCallId).toBe('tc-1');
        expect(record.command).toBe('ls');
        expect(record.args).toBe('-la');
        expect(record.outputIds).toEqual(['o1', 'o2']);
        expect(record.error).toBe('boom');
        expect(record.retryable).toBe(true);
        expect(record.source).toBe('remote');
        expect(record.timestamp).toBe(123);
    }

    @Test('parseCommandExchangeRecord applies defaults and coerces invalid/absent fields (v19-B2)')
    parseDefaults() {
        const record = parseCommandExchangeRecord('s1', {});
        expect(record.sessionId).toBe('s1');
        expect(record.sessionEpoch).toBe(0);
        expect(record.kind).toBe('command');
        expect(record.key).toBe('');
        expect(record.content).toBe('');
        expect(record.sequence).toBe(0);
        expect(record.id).toMatch(/^cmdex:s1:/);
        expect(record.outputIds).toBeUndefined();
        expect(record.retryable).toBeUndefined();
        expect(typeof record.timestamp).toBe('number');
    }
}

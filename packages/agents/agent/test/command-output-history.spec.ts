import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleCommandOutputHistoryEntry, redactCommandExchangeRecord, redactCommandOutputEntry, redactCommandOutputSecret } from '../src/ui/CommandOutputHistory';
import { CommandExchangeRecord } from '../src/memory/timeline-projection';

@Suite('Command output history redaction (v19-B2)')
export class CommandOutputHistoryRedactionSpec {
    @Test('redactCommandOutputEntry redacts secret-shaped text/command/argsSummary')
    redactsEntry() {
        const entry: AgentConsoleCommandOutputHistoryEntry = {
            id: 'o1',
            command: 'curl -H "Authorization: Bearer abc123"',
            text: 'token Bearer def456 and sk-abcdefghijkl123',
            ts: 1,
            kind: 'result',
            argsSummary: 'api_key sk-xyz123456789'
        };
        const redacted = redactCommandOutputEntry(entry);
        expect(redacted.command).toContain('Bearer [REDACTED]');
        expect(redacted.text).toContain('Bearer [REDACTED]');
        expect(redacted.text).toContain('[REDACTED]');
        expect(redacted.argsSummary).toContain('[REDACTED]');
        expect(redacted.id).toBe('o1');
        expect(redacted.ts).toBe(1);
        expect(redacted.kind).toBe('result');
    }

    @Test('redactCommandOutputEntry returns the same entry when nothing to redact')
    noop() {
        const entry: AgentConsoleCommandOutputHistoryEntry = {
            id: 'o2',
            command: 'echo hi',
            text: 'plain result',
            ts: 2,
            kind: 'result',
            argsSummary: 'nothing secret'
        };
        const redacted = redactCommandOutputEntry(entry);
        expect(redacted).toBe(entry);
    }

    @Test('redactCommandOutputEntry preserves optional argsSummary as undefined')
    preservesUndefined() {
        const entry: AgentConsoleCommandOutputHistoryEntry = {
            id: 'o3',
            command: 'echo hi',
            text: 'plain',
            ts: 3,
            kind: 'notice'
        };
        const redacted = redactCommandOutputEntry(entry);
        expect(redacted.argsSummary).toBeUndefined();
        expect(redacted).toBe(entry);
    }

    @Test('redactCommandOutputSecret strips bearer and sk- style secrets')
    secret() {
        expect(redactCommandOutputSecret('token Bearer abc123def')).toBe('token Bearer [REDACTED]');
        expect(redactCommandOutputSecret('key sk-abcdef123456')).toBe('key [REDACTED]');
        expect(redactCommandOutputSecret('plain result')).toBe('plain result');
    }

    @Test('redactCommandExchangeRecord redacts content/command/args/error (v19-B1)')
    redactsRecord() {
        const record: CommandExchangeRecord = {
            id: 'x1', seq: 0, sessionId: 's1', sessionEpoch: 2, kind: 'command', key: 'k', content: 'token Bearer abc123',
            sequence: 0, timestamp: 1, command: 'curl -H "Authorization: Bearer abc123"', args: 'api_key sk-abcdef123456', error: 'sk-abcdef123456 boom'
        };
        const redacted = redactCommandExchangeRecord(record);
        expect(redacted.content).toBe('token Bearer [REDACTED]');
        expect(redacted.command).toContain('Bearer [REDACTED]');
        expect(redacted.args).toContain('[REDACTED]');
        expect(redacted.error).toContain('[REDACTED]');
        expect(redacted.id).toBe('x1');
        expect(redacted.sequence).toBe(0);
        expect(redacted.kind).toBe('command');
    }

    @Test('redactCommandExchangeRecord returns the same record when nothing to redact')
    recordNoop() {
        const record: CommandExchangeRecord = {
            id: 'x2', seq: 1, sessionId: 's1', sessionEpoch: 2, kind: 'command', key: 'k', content: 'plain result', sequence: 1, timestamp: 2
        };
        expect(redactCommandExchangeRecord(record)).toBe(record);
    }

    @Test('redactCommandExchangeRecord preserves absent optional fields')
    recordPreservesOptional() {
        const record: CommandExchangeRecord = {
            id: 'x3', seq: 2, sessionId: 's1', sessionEpoch: 2, kind: 'command', key: 'k', content: 'plain', sequence: 2, timestamp: 3
        };
        const redacted = redactCommandExchangeRecord(record);
        expect(redacted.command).toBeUndefined();
        expect(redacted.args).toBeUndefined();
        expect(redacted.error).toBeUndefined();
        expect(redacted).toBe(record);
    }
}

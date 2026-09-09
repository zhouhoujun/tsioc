import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleCommandOutputHistoryEntry, redactCommandOutputEntry, redactCommandOutputSecret } from '../src/ui/CommandOutputHistory';

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
}

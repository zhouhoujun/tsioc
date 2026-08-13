import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RedactionFilter } from '../src';

@Suite('Redaction filter')
export class RedactionFilterTest {
    private filter = new RedactionFilter();

    @Test('redacts bearer tokens from text')
    redactsBearerTokens() {
        expect(this.filter.redactText('curl -H "Authorization: Bearer sk-abcdef1234567890" https://api.example.com'))
            .toBe('curl -H "Authorization: Bearer [REDACTED]" https://api.example.com');
    }

    @Test('redacts bare sk- keys')
    redactsBareKeys() {
        expect(this.filter.redactText('export OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456'))
            .toBe('export OPENAI_API_KEY=[REDACTED]');
    }

    @Test('leaves plain text untouched')
    leavesPlainText() {
        const text = 'Hello world, nothing secret here.';
        expect(this.filter.redactText(text)).toBe(text);
    }

    @Test('redacts secret-keyed fields in objects')
    redactsSecretKeys() {
        const result = this.filter.redactValue({
            apiKey: 'sk-live-12345678',
            password: 'hunter2',
            headers: { Authorization: 'Bearer abc123' },
            url: 'https://example.com'
        });
        expect(result.apiKey).toBe('[REDACTED]');
        expect(result.password).toBe('[REDACTED]');
        expect(result.headers.Authorization).toBe('[REDACTED]');
        expect(result.url).toBe('https://example.com');
    }

    @Test('redacts bearer values under non-secret keys')
    redactsBearerValues() {
        const result = this.filter.redactValue({
            note: 'Authorization: Bearer abc123',
            credential: 'token sk-live-99999999'
        });
        expect(result.note).toBe('Authorization: Bearer [REDACTED]');
        expect(result.credential).toBe('token [REDACTED]');
    }

    @Test('recurses into arrays')
    redactsArrays() {
        const result = this.filter.redactValue([
            { token: 'abc' },
            'Authorization: Bearer tok123'
        ]);
        expect(result[0].token).toBe('[REDACTED]');
        expect(result[1]).toBe('Authorization: Bearer [REDACTED]');
    }

    @Test('redacts message content and metadata')
    redactsMessage() {
        const message = {
            id: 'msg-1',
            role: 'user' as const,
            content: 'use token sk-abcdef1234567890 please',
            createdAt: 1,
            metadata: { apiKey: 'sk-xyz9876543210' }
        };
        const result = this.filter.redactMessage(message);
        expect(result.content).toBe('use token [REDACTED] please');
        expect(result.metadata?.apiKey).toBe('[REDACTED]');
    }

    @Test('returns same message when nothing to redact')
    returnsSameMessageWhenClean() {
        const message = {
            id: 'msg-1',
            role: 'user' as const,
            content: 'clean text',
            createdAt: 1,
            metadata: { count: 3 }
        };
        expect(this.filter.redactMessage(message)).toBe(message);
    }

    @Test('keeps metadata reference when only content changes')
    keepsMetadataWhenOnlyContentChanges() {
        const message = {
            id: 'msg-1',
            role: 'user' as const,
            content: 'use sk-abcdef1234567890 now',
            createdAt: 1,
            metadata: { count: 3 }
        };
        const result = this.filter.redactMessage(message);
        expect(result.metadata).toBe(message.metadata);
        expect(result.content).toContain('[REDACTED]');
    }
}

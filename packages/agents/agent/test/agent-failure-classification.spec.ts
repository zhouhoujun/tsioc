import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import {
    AnthropicModelAdapter,
    asModelFailure,
    describeModelFailure,
    ModelRequestError,
    OpenAICompatibleModelAdapter,
    ModelRequest
} from '../src';

function createRequest(): ModelRequest {
    return {
        sessionId: 'session-failure',
        messages: [{ id: 'm1', role: 'user', content: 'hi', createdAt: 0 }],
        tools: [],
        memory: []
    };
}

@Suite('Agent failure classification')
export class AgentFailureClassificationSpec {
    private originalFetch: any;

    @After()
    teardown() {
        (globalThis as any).fetch = this.originalFetch;
    }

    @Test('a missing API key is a terminal, localized auth failure')
    async missingKeyIsAuth() {
        const openai = new OpenAICompatibleModelAdapter({ provider: 'deepseek', model: 'deepseek-v4-flash', baseUrl: 'https://example.com' });
        let openaiKind: string | undefined;
        let openaiRetryable: boolean | undefined;
        try {
            await openai.complete(createRequest());
        } catch (error) {
            openaiKind = asModelFailure(error)?.kind;
            openaiRetryable = asModelFailure(error)?.retryable;
        }
        expect(openaiKind).toBe('auth');
        expect(openaiRetryable).toBe(false);

        const anthropic = new AnthropicModelAdapter({ provider: 'anthropic', model: 'claude-sonnet-4', baseUrl: 'https://example.com' });
        let anthropicKind: string | undefined;
        try {
            await anthropic.complete(createRequest());
        } catch (error) {
            anthropicKind = asModelFailure(error)?.kind;
        }
        expect(anthropicKind).toBe('auth');
    }

    @Test('an unsupported provider is a non-retryable config failure')
    configFailure() {
        const failure = new ModelRequestError({ kind: 'config', provider: 'mystery', model: 'm', detail: "Unsupported model provider 'mystery'", retryable: false });
        expect(asModelFailure(failure)?.kind).toBe('config');
        expect(asModelFailure(failure)?.retryable).toBe(false);
        expect(describeModelFailure(asModelFailure(failure)!)).toContain('config');
    }
}

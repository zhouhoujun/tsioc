import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { classifyModelError, isRetryableError } from '../src/model/RetryPolicy';
import { ModelRequestError } from '../src/model/ModelRequestError';
import { OpenAICompatibleModelAdapter } from '../src/model/OpenAICompatibleModelAdapter';
import { AnthropicModelAdapter } from '../src/model/AnthropicModelAdapter';
import { ModelRequest } from '../src/model/ModelRequest';

function createRequest(): ModelRequest {
    return {
        sessionId: 'session-quota',
        messages: [{ id: 'm1', role: 'user', content: 'hi', createdAt: 0 }],
        tools: [],
        memory: []
    };
}

function jsonResponse(status: number, body: any, headers: Record<string, string> = {}) {
    return {
        ok: false,
        status,
        headers: { get: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null },
        async text() {
            return JSON.stringify(body);
        }
    };
}

@Suite('Model provider failure classification')
export class ModelFailureSpec {
    private originalFetch: any;

    @After()
    teardown() {
        (globalThis as any).fetch = this.originalFetch;
    }

    @Test('classifies billing and auth statuses as terminal kinds')
    classifyTerminal() {
        expect(classifyModelError(402, 'Insufficient Balance')).toBe('quota');
        expect(classifyModelError(402, 'insufficient balance')).toBe('quota');
        expect(classifyModelError(401, 'invalid api key')).toBe('auth');
        expect(classifyModelError(403, 'forbidden')).toBe('auth');
        expect(classifyModelError(200, 'Insufficient Balance')).toBe('quota');
        expect(classifyModelError(402, 'insufficient_quota for org')).toBe('quota');
    }

    @Test('never retries terminal auth or quota failures')
    terminalNotRetryable() {
        expect(isRetryableError('quota')).toBe(false);
        expect(isRetryableError('auth')).toBe(false);
    }

    @Test('keeps a 402 provider failure structured instead of a bare string')
    async structuredQuotaFailure() {
        this.originalFetch = (globalThis as any).fetch;
        // Shape captured from a real DeepSeek 402: the id is inlined in the message,
        // not a sibling field.
        (globalThis as any).fetch = async () => jsonResponse(402, {
            error: { message: 'Insufficient Balance (request_id: req-402)', type: 'billing' }
        });

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-flash',
            baseUrl: 'https://api.deepseek.com',
            apiKey: 'test-key'
        } as any, undefined, undefined);

        let caught: any;
        try {
            await adapter.complete(createRequest());
        } catch (error) {
            caught = error;
        }

        expect(caught).toBeTruthy();
        expect(caught).toBeInstanceOf(ModelRequestError);
        const failure = caught.modelFailure;
        expect(failure).toBeTruthy();
        expect(failure.kind).toBe('quota');
        expect(failure.status).toBe(402);
        expect(failure.provider).toBe('deepseek');
        expect(failure.model).toBe('deepseek-flash');
        expect(failure.retryable).toBe(false);
        expect(failure.detail).toContain('Insufficient Balance');
        expect(failure.requestId).toBe('req-402');
    }

    @Test('marks a 401 provider failure as a terminal auth failure')
    async structuredAuthFailure() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => jsonResponse(401, {
            error: { message: 'Authentication Fails, Your api key is invalid', request_id: 'req-401' }
        });

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-flash',
            baseUrl: 'https://api.deepseek.com',
            apiKey: 'test-key'
        } as any, undefined, undefined);

        let caught: any;
        try {
            await adapter.complete(createRequest());
        } catch (error) {
            caught = error;
        }

        expect(caught).toBeInstanceOf(ModelRequestError);
        expect(caught.modelFailure.kind).toBe('auth');
        expect(caught.modelFailure.retryable).toBe(false);
    }

    @Test('streams a structured failure for terminal statuses')
    async structuredStreamFailure() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => jsonResponse(402, {
            error: { message: 'Insufficient Balance', request_id: 'req-stream' }
        });

        const adapter = new OpenAICompatibleModelAdapter({
            provider: 'deepseek',
            model: 'deepseek-flash',
            baseUrl: 'https://api.deepseek.com',
            apiKey: 'test-key'
        } as any, undefined, undefined);

        let caught: any;
        try {
            for await (const _chunk of adapter.stream(createRequest())) {
                // drain
            }
        } catch (error) {
            caught = error;
        }

        expect(caught).toBeInstanceOf(ModelRequestError);
        expect(caught.modelFailure.kind).toBe('quota');
    }

    @Test('anthropic failures carry the same structured payload')
    async structuredAnthropicFailure() {
        this.originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => ({
            ok: false,
            status: 401,
            headers: { get: () => null },
            async text() {
                return JSON.stringify({ error: { message: 'invalid x-api-key', type: 'authentication_error' } });
            }
        });

        const adapter = new AnthropicModelAdapter({
            provider: 'anthropic',
            model: 'claude-sonnet-4',
            baseUrl: 'https://api.anthropic.com',
            apiKey: 'test-key'
        } as any, undefined, undefined);

        let caught: any;
        try {
            await adapter.complete(createRequest());
        } catch (error) {
            caught = error;
        }

        expect(caught).toBeInstanceOf(ModelRequestError);
        expect(caught.modelFailure.kind).toBe('auth');
        expect(caught.modelFailure.status).toBe(401);
    }
}

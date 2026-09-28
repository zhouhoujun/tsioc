import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ModelRequestError, ModelFailure } from '@tsdi/agent';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { presentModelFailure } from '../src/AgentConsoleModelFailurePresenter';

function failure(overrides: Partial<ModelFailure> = {}): ModelFailure {
    return {
        kind: 'quota',
        status: 402,
        provider: 'deepseek',
        model: 'deepseek-flash',
        detail: 'Insufficient Balance',
        retryable: false,
        ...overrides
    };
}

function translateFrom(bundle: typeof agentUiEnglish) {
    return (key: string, params?: Record<string, any>) => {
        const parts = key.split('.');
        let current: any = bundle.messages;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return key;
            }
        }
        if (typeof current !== 'string') {
            return key;
        }
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const en = translateFrom(agentUiEnglish);
const zh = translateFrom(agentUiChinese);

@Suite('presentModelFailure (P402)')
export class PresentModelFailureTest {

    @Test('renders an actionable Chinese message for a 402 quota failure')
    quotaChinese() {
        const text = presentModelFailure(new ModelRequestError(failure()), zh)!;
        expect(text).toContain('余额不足');
        expect(text).toContain('deepseek');
        expect(text).toContain('deepseek-flash');
        expect(text).toContain('402');
        expect(text).toContain('/model');
        expect(text).not.toContain('Insufficient Balance');
    }

    @Test('renders an actionable Chinese message for a 401 auth failure')
    authChinese() {
        const text = presentModelFailure(new ModelRequestError(failure({ kind: 'auth', status: 401 })), zh)!;
        expect(text).toContain('API key');
        expect(text).toContain('401');
        expect(text).not.toContain('agent.modelError');
    }

    @Test('localizes rate-limit and server kinds instead of echoing the key')
    retryableKinds() {
        const rateLimited = presentModelFailure(new ModelRequestError(failure({ kind: 'rate-limit', status: 429, retryable: true })), zh)!;
        expect(rateLimited).toContain('限流');
        expect(rateLimited).toContain('429');

        const server = presentModelFailure(new ModelRequestError(failure({ kind: 'server', status: 503, retryable: true })), zh)!;
        expect(server).toContain('服务端错误');
        expect(server).toContain('503');
    }

    @Test('falls back to English copy when the locale has no translation')
    englishFallback() {
        const text = presentModelFailure(new ModelRequestError(failure()), en)!;
        expect(text).toContain('insufficient balance');
        expect(text).toContain('402');
    }

    @Test('never surfaces a raw i18n key when the bundle lacks the message')
    missingTranslationGuard() {
        const echo = (key: string) => key;
        const text = presentModelFailure(new ModelRequestError(failure()), echo)!;
        expect(text).not.toContain('agent.modelError.quota');
        expect(text).toContain('insufficient balance');
    }

    @Test('falls back to a built-in message when no translator is wired')
    noTranslator() {
        const text = presentModelFailure(new ModelRequestError(failure()))!;
        expect(text).toContain('insufficient balance');
        expect(text).toContain('deepseek/deepseek-flash');
    }

    @Test('appends the provider request id for support diagnostics')
    requestId() {
        const text = presentModelFailure(new ModelRequestError(failure({ requestId: 'req-402' })), en)!;
        expect(text).toContain('request_id: req-402');
    }

    @Test('returns undefined for unstructured errors so callers keep the raw message')
    unstructured() {
        expect(presentModelFailure(new Error('boom'), en)).toBeUndefined();
        expect(presentModelFailure(undefined, en)).toBeUndefined();
    }
}

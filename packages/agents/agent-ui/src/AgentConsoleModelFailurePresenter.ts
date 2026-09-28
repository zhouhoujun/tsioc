import { asModelFailure, describeModelFailure, ModelErrorKind } from '@tsdi/agent';

export type ModelFailureTranslate = (key: string, params?: Record<string, any>) => string | undefined;

const KIND_KEYS: Record<ModelErrorKind, string> = {
    quota: 'agent.modelError.quota',
    auth: 'agent.modelError.auth',
    'rate-limit': 'agent.modelError.rateLimit',
    capacity: 'agent.modelError.capacity',
    server: 'agent.modelError.server',
    network: 'agent.modelError.network',
    timeout: 'agent.modelError.timeout',
    unknown: 'agent.modelError.unknown'
};

/**
 * `TranslatorService.translate` echoes the key back when a message is missing, so a
 * truthy check would happily surface `agent.modelError.quota` as the user-visible
 * text. Treat an echoed key as "no translation available" and fall back to the
 * canonical English description, which already carries the request id.
 */
export function presentModelFailure(error: unknown, translate?: ModelFailureTranslate): string | undefined {
    const failure = asModelFailure(error);
    if (!failure) {
        return undefined;
    }
    const key = KIND_KEYS[failure.kind] ?? KIND_KEYS.unknown;
    const translated = translate?.(key, {
        provider: failure.provider || 'model provider',
        model: failure.model || 'unknown',
        status: failure.status ?? '-'
    });
    if (translated && translated !== key) {
        return failure.requestId ? `${translated} (request_id: ${failure.requestId})` : translated;
    }
    return describeModelFailure(failure);
}

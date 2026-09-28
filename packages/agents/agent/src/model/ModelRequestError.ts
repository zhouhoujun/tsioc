import { classifyModelError, isRetryableError, ModelErrorKind } from './RetryPolicy';

/**
 * Structured, transport-safe description of a failed model request.
 * Plain data only: it survives JSON round-trips through the gateway RPC
 * boundary, where `instanceof` checks cannot.
 */
export interface ModelFailure {
    kind: ModelErrorKind;
    status?: number;
    provider: string;
    model: string;
    detail?: string;
    requestId?: string;
    retryable: boolean;
}

const MAX_DETAIL_LENGTH = 300;

function truncate(value: string): string {
    const text = value.trim();
    return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}…` : text;
}

function readHeader(headers: any, name: string): string | undefined {
    const getter = headers?.get;
    if (typeof getter !== 'function') {
        return undefined;
    }
    const value = getter.call(headers, name);
    return value ? String(value) : undefined;
}

function scrapeRequestId(text: string | undefined): string | undefined {
    const match = /request[_ ]?id[:=]\s*"?([\w-]+)"?/i.exec(text ?? '');
    return match ? match[1] : undefined;
}

function extractRequestId(detail: string | undefined, bodyText: string | undefined, headers: any): string | undefined {
    if (bodyText) {
        try {
            const parsed = JSON.parse(bodyText) as any;
            const fromBody = parsed?.error?.request_id ?? parsed?.error?.requestId
                ?? parsed?.request_id ?? parsed?.requestId ?? parsed?.error?.id;
            if (fromBody) {
                return String(fromBody);
            }
        } catch {
            return scrapeRequestId(bodyText) ?? scrapeRequestId(detail);
        }
    }
    // Providers such as DeepSeek inline the id in the message itself, which is all
    // that survives once the adapter has extracted `error.message` from the body.
    return scrapeRequestId(detail) ?? readHeader(headers, 'x-request-id') ?? readHeader(headers, 'request-id');
}

function extractDetail(detail?: string, bodyText?: string): string | undefined {
    if (detail) {
        return truncate(detail);
    }
    if (!bodyText) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(bodyText) as any;
        const message = parsed?.error?.message ?? parsed?.message ?? parsed?.error;
        if (typeof message === 'string' && message) {
            return truncate(message);
        }
    } catch {
        return truncate(bodyText);
    }
    return truncate(bodyText);
}

export class ModelRequestError extends Error {
    readonly modelFailure: ModelFailure;

    constructor(failure: ModelFailure, message?: string) {
        super(message ?? ModelRequestError.formatMessage(failure));
        this.name = 'ModelRequestError';
        this.modelFailure = failure;
        Object.setPrototypeOf(this, ModelRequestError.prototype);
    }

    private static formatMessage(failure: ModelFailure): string {
        const head = `Model request failed with ${failure.status ?? failure.kind}`;
        const where = failure.provider || failure.model ? ` (${failure.provider || 'unknown'}/${failure.model || 'unknown'})` : '';
        const detail = failure.detail ? `: ${failure.detail}` : '';
        return `${head}${where}${detail}`;
    }
}

export function createModelRequestError(input: {
    status?: number;
    detail?: string;
    bodyText?: string;
    provider?: string;
    model?: string;
    headers?: any;
}): ModelRequestError {
    const detail = extractDetail(input.detail, input.bodyText);
    const kind = classifyModelError(input.status, detail);
    return new ModelRequestError({
        kind,
        status: input.status,
        provider: String(input.provider ?? ''),
        model: String(input.model ?? ''),
        detail,
        requestId: extractRequestId(detail, input.bodyText, input.headers),
        retryable: isRetryableError(kind)
    });
}

/**
 * Reads the structured payload from an unknown throwable without relying on
 * `instanceof`, so consumers keep working when the error crossed an RPC or
 * worker boundary and was rebuilt as a plain object.
 */
export function asModelFailure(error: unknown): ModelFailure | undefined {
    const failure = (error as any)?.modelFailure;
    if (!failure || typeof failure !== 'object' || !failure.kind) {
        return undefined;
    }
    return failure as ModelFailure;
}

const REMEDY_HINTS: Record<ModelErrorKind, string> = {
    quota: 'Top up the account or switch model, then retry.',
    auth: 'Update the API key in settings, then retry.',
    'rate-limit': 'Wait a moment and retry; switch model if it keeps happening.',
    capacity: 'The model is overloaded; retry or switch model.',
    server: 'Usually temporary; retry, or switch model.',
    network: 'Check the network and baseUrl, then retry.',
    timeout: 'Retry, or raise timeoutMs in settings.',
    unknown: 'Retry, or switch model.'
};

/**
 * Builds the actionable, transport-agnostic description of a failed model request.
 * This is the canonical English wording shared by every surface (CLI, console);
 * localized surfaces override it with their own translations.
 */
export function describeModelFailure(failure: ModelFailure): string {
    const target = failure.provider || failure.model
        ? `${failure.provider || 'unknown provider'}/${failure.model || 'unknown model'}`
        : 'the model provider';
    const status = failure.status ? ` (status ${failure.status})` : '';
    const head = failure.kind === 'quota'
        ? `Model request refused: insufficient balance for ${target}${status}.`
        : `Model request failed (${failure.kind}) for ${target}${status}.`;
    const hint = REMEDY_HINTS[failure.kind] ?? REMEDY_HINTS.unknown;
    const requestId = failure.requestId ? ` (request_id: ${failure.requestId})` : '';
    return `${head} ${hint}${requestId}`;
}

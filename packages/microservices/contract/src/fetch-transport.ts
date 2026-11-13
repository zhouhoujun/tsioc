import { ContractCallRequest, ContractHttpError, ContractTransport } from './client';

export interface FetchContractTransportOptions {
    /** base URL prepended to contract paths. */
    baseUrl?: string;
    /** static headers for every call. */
    headers?: Record<string, string>;
    /** request timeout in milliseconds. */
    timeoutMs?: number;
    /** injectable fetch implementation (tests/custom agents). */
    fetchImpl?: typeof fetch;
}

/**
 * Simple fetch-based transport for contract clients.
 */
export function createFetchContractTransport(options: FetchContractTransportOptions = {}): ContractTransport {
    return {
        async request<T = any>(request: ContractCallRequest): Promise<T> {
            const fetchImpl = options.fetchImpl ?? fetch;
            const url = buildUrl(options.baseUrl, request.path, request.query);
            const headers: Record<string, string> = {
                accept: 'application/json',
                ...(options.headers ?? {}),
                ...(request.headers ?? {})
            };
            let body: any;
            if (request.body !== undefined) {
                headers['content-type'] = headers['content-type'] ?? 'application/json';
                body = typeof request.body === 'string'
                    ? request.body
                    : JSON.stringify(request.body);
            }
            const controller = new AbortController();
            const timeout = options.timeoutMs ?? 10_000;
            const timer = setTimeout(() => controller.abort(), timeout);
            (timer as any)?.unref?.();
            try {
                const response = await fetchImpl(url, {
                    method: request.method,
                    headers,
                    body,
                    signal: controller.signal
                });
                const text = await response.text();
                let payload: any = null;
                if (text) {
                    try {
                        payload = JSON.parse(text);
                    } catch {
                        payload = text;
                    }
                }
                if (!response.ok) {
                    throw new ContractHttpError(
                        `${request.method} ${request.path} failed with ${response.status}`,
                        response.status,
                        payload
                    );
                }
                return payload as T;
            } finally {
                clearTimeout(timer);
            }
        }
    };
}

function buildUrl(baseUrl: string | undefined, path: string, query?: Record<string, any>): string {
    const base = (baseUrl ?? '').replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    let url = `${base}${normalized}` || normalized;
    if (query && Object.keys(query).length) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value != null) {
                search.set(key, String(value));
            }
        }
        const text = search.toString();
        if (text) {
            url += `${url.includes('?') ? '&' : '?'}${text}`;
        }
    }
    return url;
}

import { HttpRequestMessage } from '@tsdi/http-microservice';
import { GatewayWebhookOptions, ResolvedGatewayRoute } from './gateway.options';
import { GatewayForwardResult } from './gateway.types';

export interface GatewayWebhookOptionsExt extends GatewayWebhookOptions {
    /** Abort a webhook attempt after this many ms. Default 5000. */
    timeoutMs?: number;
    /** Additional attempts after the first failure. Default 0. */
    retries?: number;
    /** Delay before each retry. Default 0. */
    retryBackoffMs?: number;
    /**
     * Opt-in SSRF allowlist. When set, only these hostnames are dispatched
     * (`example.com` or `*.example.com`); everything else is rejected.
     */
    allowedHosts?: string[];
}

function hostAllowed(hostname: string, allowedHosts: string[]): boolean {
    const host = hostname.toLowerCase();
    return allowedHosts.some(rule => {
        const value = rule.toLowerCase().trim();
        if (!value) {
            return false;
        }
        if (value.startsWith('*.')) {
            return host.endsWith(value.slice(1)) && host.length > value.length - 1;
        }
        return host === value;
    });
}

/**
 * Gateway webhook dispatcher: timeout, bounded retries and an opt-in host
 * allowlist for SSRF protection.
 */
export class GatewayWebhook {
    constructor(private readonly getFetch: () => typeof fetch | undefined = () => undefined) { }

    async dispatch(route: ResolvedGatewayRoute, request: HttpRequestMessage, response: GatewayForwardResult): Promise<void> {
        const webhook = route.webhook as GatewayWebhookOptionsExt | undefined;
        if (!webhook?.enabled) {
            return;
        }
        if (webhook.onSuccess === true && !(response.status >= 200 && response.status < 300)) {
            return;
        }
        const runner = () => this.send(webhook, request, response);
        if (webhook.async !== false) {
            void runner().catch(() => undefined);
        } else {
            await runner();
        }
    }

    private async send(
        webhook: GatewayWebhookOptionsExt,
        request: HttpRequestMessage,
        response: GatewayForwardResult
    ): Promise<void> {
        const target = new URL(webhook.url);
        if (webhook.allowedHosts?.length) {
            if (!/^https?:$/.test(target.protocol)) {
                throw new Error(`webhook protocol '${target.protocol}' is not allowed`);
            }
            if (!hostAllowed(target.hostname, webhook.allowedHosts)) {
                throw new Error(`webhook host '${target.hostname}' is not in the allowlist`);
            }
        }
        const headers = typeof webhook.headers === 'function'
            ? webhook.headers(request, response)
            : (webhook.headers ?? {});
        const body = webhook.body === undefined
            ? {
                request: {
                    url: request.url,
                    method: request.method,
                    headers: request.headers,
                    query: request.query,
                    body: request.body ?? null
                },
                response
            }
            : (typeof webhook.body === 'function' ? webhook.body(request, response) : webhook.body);
        const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body as any : JSON.stringify(body);
        const attempts = Math.max(0, webhook.retries ?? 0) + 1;
        let lastError: any;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const fetchImpl = this.getFetch() ?? fetch;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), webhook.timeoutMs ?? 5_000);
            try {
                await fetchImpl(webhook.url, {
                    method: webhook.method ?? 'POST',
                    headers: {
                        'content-type': 'application/json',
                        ...headers
                    },
                    body: payload,
                    signal: controller.signal,
                    // An allowlist must not be bypassed by a redirect to an
                    // internal address; surface 3xx as a delivery failure.
                    ...(webhook.allowedHosts?.length ? { redirect: 'manual' as const } : {})
                });
                return;
            } catch (error) {
                lastError = error;
                if (attempt < attempts - 1 && (webhook.retryBackoffMs ?? 0) > 0) {
                    await new Promise(resolve => setTimeout(resolve, webhook.retryBackoffMs));
                }
            } finally {
                clearTimeout(timeout);
            }
        }
        throw lastError instanceof Error
            ? lastError
            : Object.assign(new Error(`webhook delivery failed: ${String(lastError)}`), { cause: lastError });
    }
}

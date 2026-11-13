import { lastValueFrom } from 'rxjs';
import { ContractCallRequest, ContractHttpError, ContractTransport } from '@tsdi/microservice-contract';
import { HttpClient } from './client';
import { HttpRequest } from './request';

export interface HttpContractTransportOptions {
    /**
     * Base URL prepended to contract paths. When omitted the client's own
     * configured URL/authority is used.
     */
    baseUrl?: string;
}

/**
 * Contract transport backed by `HttpClient`.
 *
 * This reuses the full client pipeline: discovery, load balancing, retry,
 * circuit breaker, timeouts, metrics and tracing spans.
 */
export function createHttpContractTransport(
    client: HttpClient,
    options: HttpContractTransportOptions = {}
): ContractTransport {
    return {
        async request<T = any>(request: ContractCallRequest): Promise<T> {
            const url = joinUrl(options.baseUrl, request.path);
            const response = await lastValueFrom(client.send(new HttpRequest(url, null, {
                method: request.method,
                body: request.body,
                params: request.query,
                headers: request.headers,
                observe: 'response',
                responseType: 'json'
            } as any))) as any;

            const status = Number(response?.status ?? response?.statusCode ?? 200);
            if (status < 200 || status >= 300) {
                throw new ContractHttpError(
                    `${request.method} ${request.path} failed with ${status}`,
                    status,
                    response?.body
                );
            }
            return (response?.body ?? response) as T;
        }
    };
}

function joinUrl(base: string | undefined, path: string): string {
    if (!base) {
        return path;
    }
    const normalizedBase = base.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}

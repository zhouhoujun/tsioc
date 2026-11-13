import { lastValueFrom } from 'rxjs';
import { ContractCallRequest, ContractHttpError, ContractTransport } from '@tsdi/microservice-contract';
import { EndpointResolver, EndpointSelector } from '@tsdi/discovery';
import { ServiceEndpoint } from '@tsdi/discovery';
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

export interface RegistryContractTransportOptions {
    /** required endpoint protocol, e.g. `http`. */
    protocol?: string | string[];
    /** optional load-balancing selector; defaults to the first UP endpoint. */
    selector?: EndpointSelector;
}

/**
 * Resolve a service through `EndpointResolver` and call it with `HttpClient`.
 *
 * This keeps the client retry/timeout/metrics/tracing pipeline while allowing
 * the contract client to use a registry instead of a fixed base URL.
 */
export function createRegistryContractTransport(
    client: HttpClient,
    resolver: EndpointResolver,
    service: string,
    options: RegistryContractTransportOptions = {}
): ContractTransport {
    return {
        async request<T = any>(request: ContractCallRequest): Promise<T> {
            const endpoints = await resolver.resolve(service, {
                protocol: options.protocol,
                status: 'UP'
            });
            if (!endpoints.length) {
                throw new ContractHttpError(`No available endpoint for service '${service}'`, 503);
            }
            const endpoint = options.selector
                ? options.selector.select(endpoints) ?? endpoints[0]
                : endpoints[0];
            return createHttpContractTransport(client, {
                baseUrl: endpointBaseUrl(endpoint)
            }).request<T>(request);
        }
    };
}

function endpointBaseUrl(endpoint: ServiceEndpoint): string {
    if (/^https?:\/\//i.test(endpoint.address)) {
        return endpoint.address.replace(/\/$/, '');
    }
    const protocol = endpoint.protocol ?? 'http';
    const hasPort = /:\d+$/.test(endpoint.address);
    return `${protocol}://${endpoint.address}${!hasPort && endpoint.port ? `:${endpoint.port}` : ''}`;
}

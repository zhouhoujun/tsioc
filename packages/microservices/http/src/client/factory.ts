import { asProvider, createInjector, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, ContentType } from '@tsdi/common';
import { CLIENT_CONFIGS, BodySerializeStrategy, ClientEndpoint, ClientFeatureKind, ClientHandler, ClientTransportFeature, ServiceError, TimeoutStrategy, CLIENT_SELECTED_ENDPOINT, getClientBackendToken, getClientHandlerToken, getClientInterceptorsToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { ensureClientConnectedInterceptor } from '@tsdi/client';
import { HTTP_CLIENT_OPTIONS, HttpClientOptions } from './options';
import { HttpClient } from './client';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import { Observable } from 'rxjs';
import { ResponseFactory } from '@tsdi/common';
import { HttpBodySerializeStrategy } from './strategies/HttpBodySerializeStrategy';
import { HttpTimeoutStrategy } from './strategies/HttpTimeoutStrategy';
import { HttpResponseEventFactory } from './response.factory';

function httpClientTransportFactory(option: Partial<HttpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.HTTP,
        side: TransferSide.client,
        ...option,
        features: { ...option.features },
    } as HttpClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: HTTP_CLIENT_OPTIONS, useValue: config },
    );
    (config as any).transportFeature = (next: HttpClientOptions, defaultFlag?: boolean) => httpClientTransportFactory({
        ...config,
        ...next,
        features: { ...config.features, ...(next?.features ?? {}) }
    }, defaultFlag ?? asDefault);
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const interceptorsToken = getClientInterceptorsToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        { provide: BodySerializeStrategy, useClass: HttpBodySerializeStrategy },
        { provide: TimeoutStrategy, useClass: HttpTimeoutStrategy },
        HttpResponseEventFactory,
        { provide: ResponseFactory, useExisting: HttpResponseEventFactory },
        asProvider({ provide: backendToken, useFactory: () => createHttpBackend(config), multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: HTTP_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        HttpClient
                    ]
                });
                return childInjector.get(HttpClient);
            },
            deps: [Injector]
        },
        { provide: interceptorsToken, useValue: ensureClientConnectedInterceptor(config), multi: true, multiOrder: 0 }
    ];
    if (asDefault) providers.push({ provide: HttpClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withHttpTransport(...options: Partial<HttpClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => httpClientTransportFactory(o, o.asDefault ?? (i === 0)));
}

function endpointBaseUrl(endpoint?: ClientEndpoint): string | undefined {
    if (!endpoint?.address) {
        return undefined;
    }
    if (/^https?:\/\//i.test(endpoint.address)) {
        return endpoint.address.replace(/\/$/, '');
    }
    const protocol = endpoint.protocol ?? 'http';
    const hasPort = /:\d+$/.test(endpoint.address);
    return `${protocol}://${endpoint.address}${!hasPort && endpoint.port ? `:${endpoint.port}` : ''}`;
}

function createAgentInstance<T extends http.Agent | https.Agent>(
    Agent: new (options: http.AgentOptions) => T,
    pool: NonNullable<HttpClientOptions['pool']>
): T {
    const max = Math.max(1, pool.max ?? 10);
    return new Agent({
        keepAlive: true,
        maxSockets: max,
        maxFreeSockets: max,
        timeout: pool.idleTimeout ?? 30_000,
        scheduling: 'lifo'
    });
}

function createHttpBackend(config: HttpClientOptions) {
    return (req: any, context: any) => new Observable<any>((observer: any) => {
        const client = context.get(HttpClient) as HttpClient | undefined;
        const rawBody = req.body ?? req.payload ?? null;
        const url = req.getUrlWithParams?.() ?? req.url;
        const selected = context.has?.(CLIENT_SELECTED_ENDPOINT)
            ? context.get(CLIENT_SELECTED_ENDPOINT) as ClientEndpoint
            : undefined;
        const baseUrl = endpointBaseUrl(selected) ?? config.authority ?? config.url ?? 'http://127.0.0.1';
        const target = new URL(url, baseUrl);
        const bodySerializeStrategy = context.has(BodySerializeStrategy) ? context.get(BodySerializeStrategy) as BodySerializeStrategy : null;
        const body = rawBody != null && bodySerializeStrategy?.canHandle(rawBody)
            ? bodySerializeStrategy.serialize(rawBody, context)
            : rawBody;
        const headers = { ...(req.headers?.getHeaders?.() ?? {}) } as Record<string, any>;
        if (!headers['content-type'] && rawBody != null && bodySerializeStrategy?.canHandle(rawBody)) {
            const detectedContentType = bodySerializeStrategy.detectContentType(rawBody);
            if (detectedContentType) {
                headers['content-type'] = detectedContentType;
            }
        }
        const finish = (statusCode: number, statusMessage: string, responseHeaders: Record<string, any>, responseBody: any) => {
            const ok = statusCode >= 200 && statusCode < 300;
            const response = {
                url: target.toString(),
                headers: responseHeaders,
                statusCode,
                status: statusCode,
                statusMessage,
                statusText: statusMessage,
                ok,
                body: responseBody,
                payload: responseBody,
            };
            const throwOnError = (req as any).throwOnError ?? config.throwOnError;
            const validateStatus = (req as any).validateStatus ?? config.validateStatus;
            const accepted = validateStatus ? !!validateStatus(statusCode) : ok;
            if (throwOnError !== false && !accepted) {
                observer.error(new ServiceError(
                    `HTTP ${statusCode}${statusMessage ? ` ${statusMessage}` : ''} for ${req.method ?? 'GET'} ${target.toString()}`,
                    'upstream',
                    { status: statusCode, statusMessage, body: responseBody, headers: responseHeaders, url: target.toString(), response }
                ));
                return;
            }
            observer.next(req.observe === 'response' ? response : responseBody);
            observer.complete();
        };
        const parseBody = (raw: Buffer) => {
            const responseType = req.responseType ?? 'json';
            if (!raw.length) return null;
            if (responseType === 'arraybuffer') {
                return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
            }
            const text = raw.toString('utf8');
            if (responseType === 'text') return text;
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        };
        const writeBody = (stream: http2.ClientHttp2Stream | http.ClientRequest) => {
            if (body == null) {
                stream.end();
                return;
            }
            if (Buffer.isBuffer(body) || typeof body === 'string') {
                stream.end(body);
                return;
            }
            if (body instanceof Uint8Array) {
                stream.end(Buffer.from(body));
                return;
            }
            if (typeof (body as any)?.pipe === 'function') {
                (body as NodeJS.ReadableStream).pipe(stream as any);
                return;
            }
            stream.end(JSON.stringify(body));
        };

        let httpAgent: http.Agent | undefined;
        let httpsAgent: https.Agent | undefined;
        const createAgent = (protocol: string) => {
            if (!config.pool) {
                return undefined;
            }
            if (protocol === 'https:') {
                if (!httpsAgent) {
                    httpsAgent = createAgentInstance(https.Agent, config.pool);
                    (client as HttpClient | undefined)?.useAgent?.(httpsAgent);
                }
                return httpsAgent;
            }
            if (!httpAgent) {
                httpAgent = createAgentInstance(http.Agent, config.pool);
                (client as HttpClient | undefined)?.useAgent?.(httpAgent);
            }
            return httpAgent;
        };

        if (config.authority) {
            const session = client?.getSession();
            if (!session) {
                observer.error(new ServiceError('HTTP/2 session is not connected', 'transport', { url: target.toString() }));
                return;
            }
            const path = `${target.pathname}${target.search}` || '/';
            const requestHeaders = {
                ...headers,
                ':method': req.method,
                ':path': path,
                ':authority': target.host,
                accept: headers.accept ?? ContentType.REQUEST_ACCEPT,
            } as http2.OutgoingHttpHeaders;
            const stream = session.request(requestHeaders, config.requestOptions);
            const chunks: Uint8Array[] = [];
            let statusCode = 0;
            let statusMessage = '';
            let responseHeaders: Record<string, any> = {};
            stream.on('response', (resHeaders) => {
                responseHeaders = { ...resHeaders };
                statusCode = Number(resHeaders[':status'] ?? 0);
                delete responseHeaders[':status'];
            });
            stream.on('data', (chunk: Buffer) => chunks.push(Uint8Array.from(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))));
            stream.on('end', () => finish(statusCode, statusMessage, responseHeaders, parseBody(Buffer.concat(chunks))));
            stream.on('error', err => observer.error(err));
            writeBody(stream);
            return () => stream.destroy();
        }

        const agent = config.requestOpts?.agent ?? createAgent(target.protocol);
        const requestOptions: http.RequestOptions = {
            ...(config.requestOpts ?? {}),
            method: req.method,
            headers,
            agent,
        };
        const request = target.protocol === 'https:' ? https.request(target, requestOptions) : http.request(target, requestOptions);
        const chunks: Uint8Array[] = [];
        let statusCode = 0;
        let statusMessage = '';
        let responseHeaders: Record<string, any> = {};
        request.on('response', (res) => {
            responseHeaders = { ...res.headers };
            statusCode = res.statusCode ?? 0;
            statusMessage = res.statusMessage ?? '';
            res.on('data', (chunk: Buffer) => chunks.push(Uint8Array.from(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))));
            res.on('end', () => finish(statusCode, statusMessage, responseHeaders, parseBody(Buffer.concat(chunks))));
        });
        request.on('error', err => observer.error(err));
        writeBody(request);
        return () => request.destroy();
    });
}

import { asProvider, getClassRef, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, TransferSide, Transport, ContentType } from '@tsdi/common';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientInterceptorsToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { HTTP_CLIENT_OPTIONS, HttpClientOptions } from './options';
import { HttpClient } from './client';
import { MessageReaderFactory } from '@tsdi/core';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import { Observable } from 'rxjs';

function httpClientTransportFactory(option: Partial<HttpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.HTTP,
        side: TransferSide.client,
        ...option,
        features: { ...option.features },
    } as HttpClientOptions;
    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: HTTP_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const interceptorsToken = getClientInterceptorsToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: () => createHttpBackend(config), multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => getClassRef(HttpClient).createInvocation(injector, {
                providers: [
                    { provide: HTTP_CLIENT_OPTIONS, useValue: config },
                    { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
                    { provide: ClientHandler, useExisting: hanlderToken }
                ]
            }).instance,
            deps: [Injector]
        },
        { provide: interceptorsToken, useValue: (req: any, next: any, context: any) => next(req, context), multi: true }
    ];
    if (asDefault) providers.push({ provide: HttpClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withHttpClientTransport(...options: Partial<HttpClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => httpClientTransportFactory(o, o.asDefault ?? (i === 0)));
}

function createHttpBackend(config: HttpClientOptions) {
    return (req: any, context: any) => new Observable<any>((observer: any) => {
        const client = context.get(HttpClient) as HttpClient | undefined;
        const body = req.body ?? req.payload ?? null;
        const url = req.getUrlWithParams?.() ?? req.url;
        const baseUrl = config.authority ?? config.url ?? 'http://127.0.0.1';
        const target = new URL(url, baseUrl);
        const headers = { ...(req.headers?.getHeaders?.() ?? {}) };
        const finish = (statusCode: number, statusMessage: string, responseHeaders: Record<string, any>, responseBody: any) => {
            observer.next({
                url: target.toString(),
                headers: responseHeaders,
                statusCode,
                status: statusCode,
                statusMessage,
                statusText: statusMessage,
                ok: statusCode >= 200 && statusCode < 300,
                body: responseBody,
                payload: responseBody,
            });
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

        if (config.authority) {
            const session = client?.getSession();
            if (!session) {
                observer.error(new Error('HTTP/2 session is not connected'));
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
            const chunks: Buffer[] = [];
            let statusCode = 0;
            let statusMessage = '';
            let responseHeaders: Record<string, any> = {};
            stream.on('response', (resHeaders) => {
                responseHeaders = { ...resHeaders };
                statusCode = Number(resHeaders[':status'] ?? 0);
                delete responseHeaders[':status'];
            });
            stream.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            stream.on('end', () => finish(statusCode, statusMessage, responseHeaders, parseBody(Buffer.concat(chunks))));
            stream.on('error', err => observer.error(err));
            writeBody(stream);
            return () => stream.destroy();
        }

        const requestOptions: http.RequestOptions = {
            method: req.method,
            headers,
        };
        const request = target.protocol === 'https:' ? https.request(target, requestOptions) : http.request(target, requestOptions);
        const chunks: Buffer[] = [];
        let statusCode = 0;
        let statusMessage = '';
        let responseHeaders: Record<string, any> = {};
        request.on('response', (res) => {
            responseHeaders = { ...res.headers };
            statusCode = res.statusCode ?? 0;
            statusMessage = res.statusMessage ?? '';
            res.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            res.on('end', () => finish(statusCode, statusMessage, responseHeaders, parseBody(Buffer.concat(chunks))));
        });
        request.on('error', err => observer.error(err));
        writeBody(request);
        return () => request.destroy();
    });
}

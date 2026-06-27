import { Injectable, isNil } from '@tsdi/ioc';
import { MessageAdapter, REQUEST, RequestContext, RequestFilter } from '@tsdi/common';
import { Observable, of } from 'rxjs';
import * as coap from 'coap';
import { CoapMessageAdapterFactory } from './message-adapter.factory';
import { SOCKET, COAP_RESPONSE } from '../context';

@Injectable()
export class CoapNormalizeAdapterFilter extends RequestFilter<any, Observable<any>, RequestContext> {
    doFilter(input: any, next: any, context: RequestContext): Observable<any> {
        if (!context.has(MessageAdapter)) {
            const rawReq = context.get(SOCKET) as coap.IncomingMessage;
            if (rawReq) {
                const requestData = this.normalizeRequest(rawReq);
                context.set(REQUEST, requestData);
                context.setPayload(requestData);

                const coapResponse = context.get(COAP_RESPONSE);
                const factory = context.getInjector()?.get(CoapMessageAdapterFactory);
                if (factory && coapResponse) {
                    const adapter = factory.create({ request: requestData, response: coapResponse, context });
                    context.setMessageAdapter(adapter);
                }
            }
        }
        return next.handle(input, context);
    }

    private normalizeRequest(req: coap.IncomingMessage): Record<string, any> {
        const rawPayload = Buffer.isBuffer(req.payload) ? Buffer.from(req.payload) : (req.payload ? Buffer.from(req.payload) : undefined);
        const rawText = rawPayload?.toString('utf8') ?? '';
        const parsed = this.tryParseJson(rawText);
        const requestSource = this.isEnvelope(parsed) ? parsed : {};
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const rawUrl = String(requestSource.url ?? req.url ?? '/');
        const url = rawUrl.split('?', 1)[0] || '/';
        const method = String(requestSource.method || req.method || 'GET').toUpperCase();
        const headers = {
            ...this.toHeaderRecord((req as any).headers),
            ...this.toHeaderRecord((req as any).options),
            ...this.toHeaderRecord(requestSource.headers)
        };
        const query = requestSource.query ?? this.parseQuery(rawUrl);

        return {
            id: requestSource.id,
            pattern: requestSource.pattern,
            observe: requestSource.observe,
            url,
            method,
            headers,
            params: requestSource.params ?? query,
            query,
            body,
            payload: body,
            rawBody: rawPayload ?? rawText,
            request: req,
            nativeHeaders: (req as any).headers,
            nativeOptions: (req as any).options,
            getHeader(name: string) {
                const lower = name.toLowerCase();
                return headers[lower] ?? headers[name];
            },
            hasHeader(name: string) {
                return this.getHeader(name) != null;
            },
            getHeaderNames() {
                return Object.keys(headers);
            },
            getHeaders() {
                return headers;
            }
        };
    }

    private tryParseJson(payload: string): any {
        if (!payload) return undefined;
        try { return JSON.parse(payload); }
        catch { return payload; }
    }

    private isEnvelope(value: any): value is Record<string, any> {
        return !!value && typeof value === 'object' && (
            'url' in value || 'method' in value || 'body' in value || 'payload' in value || 'headers' in value || 'pattern' in value
        );
    }

    private parseQuery(rawUrl: string): Record<string, string> {
        const queryText = rawUrl.split('?', 2)[1];
        const query: Record<string, string> = {};
        if (!queryText) return query;
        queryText.split('&').forEach(entry => {
            if (!entry) return;
            const [key, value = ''] = entry.split('=', 2);
            if (!key) return;
            query[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        return query;
    }

    private toHeaderRecord(source: any): Record<string, any> {
        const record: Record<string, any> = {};
        if (!source) return record;
        if (Array.isArray(source)) {
            source.forEach((entry: any) => {
                if (entry && typeof entry.name === 'string') {
                    record[String(entry.name).toLowerCase()] = entry.value;
                }
            });
            return record;
        }
        Object.keys(source).forEach(key => {
            record[key.toLowerCase()] = source[key];
        });
        return record;
    }
}

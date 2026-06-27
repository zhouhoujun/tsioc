import { Injectable, isNil } from '@tsdi/ioc';
import { CONTENT_TYPE, ContentType, RequestContext, RequestFilter, StatusMessageAdapter } from '@tsdi/common';
import { Observable, of, mergeMap, catchError, throwError } from 'rxjs';
import { InjectLog, Logger } from '@tsdi/logger';
import * as coap from 'coap';
import { COAP_RESPONSE } from '../context';

@Injectable()
export class CoapTransportSenderFilter extends RequestFilter<any, Observable<any>, RequestContext> {
    @InjectLog() logger!: Logger;

    doFilter(input: any, next: any, context: RequestContext): Observable<any> {
        return next.handle(input, context).pipe(
            mergeMap((response) => {
                this.writeResponse(context, response);
                return of(response);
            }),
            catchError((err) => {
                this.writeError(context, err);
                return throwError(() => err);
            })
        );
    }

    private writeResponse(context: RequestContext, response: any) {
        const res = context.get(COAP_RESPONSE) as coap.OutgoingMessage;
        if (!res) return;
        const adapter = context.get(StatusMessageAdapter);
        if (isNil(response) && context.getPayload<any>()?.type === ContentType.APPL_JSON && context.getPayload<any>()?.body) {
            this.writeError(context, Object.assign(new Error('Packet length exceeded'), { status: '4.00', statusCode: 400 }));
            return;
        }
        const status = adapter?.status ?? '2.05';
        const contentType = adapter?.getResponseHeader('content-type') ?? context.get(CONTENT_TYPE);
        const payload = !isNil((adapter as any)?.body) ? (adapter as any).body : adapter?.payload ?? response;

        const headerNames = adapter?.getResponseHeaderNames() ?? [];
        headerNames.forEach((name: string) => {
            const value = adapter?.getResponseHeader(name);
            if (!isNil(value)) {
                try {
                    if (name.toLowerCase() === 'content-format' || name.toLowerCase() === 'max-age') {
                        const num = Number(value);
                        if (Number.isFinite(num)) {
                            (res as any).setOption?.(name, num);
                        }
                    } else {
                        (res as any).setHeader?.(name, value as any);
                    }
                } catch {
                    this.logger.warn('Failed to set CoAP header', name, value as any);
                }
            }
        });

        if (!isNil(status)) {
            (res as any).code = status;
        }
        if (contentType && !(res as any).getOption?.('Content-Format')) {
            const contentFormat = this.mapContentTypeToFormat(String(contentType));
            if (contentFormat) {
                (res as any).setOption?.('Content-Format', contentFormat);
            }
        }
        if (isNil(payload)) {
            res.end();
            return;
        }
        if (Buffer.isBuffer(payload) || typeof payload === 'string') {
            res.end(payload);
            return;
        }
        res.end(JSON.stringify(payload));
    }

    private writeError(context: RequestContext, err: any) {
        this.logger.error(err);
        const res = context.get(COAP_RESPONSE) as coap.OutgoingMessage;
        if (!res) return;

        const rawStatus = err?.statusCode ?? err?.status;
        const status = this.toCoapStatus(rawStatus, err);
        const statusCode = typeof rawStatus === 'number' ? rawStatus : this.toHttpStatus(status);
        const expose = typeof err?.expose === 'boolean' ? err.expose : String(status).startsWith('4');
        const statusMessage = err?.statusMessage || err?.message || 'Error';
        const body = String(status).startsWith('5') && !expose
            ? { statusCode, statusMessage: 'Internal Server Error', message: 'Internal Server Error' }
            : { statusCode, statusMessage, message: statusMessage, ...(err?.details ? { details: err.details } : {}) };

        const adapter = context.get(StatusMessageAdapter);
        if (adapter) {
            adapter.setStatus(status, statusMessage).setError(err).setPayload(body);
        }
        (res as any).code = status;
        res.end(JSON.stringify(body));
    }

    private toCoapStatus(status: any, err: any): string {
        if (typeof status === 'number') {
            if (status >= 500) return '5.00';
            if (status >= 400) return '4.00';
            if (status >= 300) return '3.00';
            if (status >= 200) return '2.05';
        }
        return status ?? (err?.constructor?.name === 'MissingParameterException' ? '4.00' : '5.00');
    }

    private toHttpStatus(status: any): number {
        if (String(status).startsWith('5')) return 500;
        if (String(status).startsWith('4')) return 400;
        if (String(status).startsWith('3')) return 300;
        return 200;
    }

    private mapContentTypeToFormat(contentType: string): string | undefined {
        const normalized = contentType.toLowerCase();
        if (normalized.includes('application/json')) return 'application/json';
        if (normalized.includes('text/plain')) return 'text/plain';
        if (normalized.includes('application/xml') || normalized.includes('text/xml')) return 'application/xml';
        if (normalized.includes('application/octet-stream')) return 'application/octet-stream';
        return undefined;
    }
}

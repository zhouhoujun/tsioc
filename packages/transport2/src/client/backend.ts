import { BytesPipe, EndpointBackend, OutgoingHeaders, Redirector, RequestContext, ResHeaders, ResponseJsonParseError } from '@tsdi/core';
import { Injectable, InvocationContext, type_undef } from '@tsdi/ioc';
import { filter, Observable, Observer, throwError } from 'rxjs';
import { ev, hdr, identity } from '../consts';
import { TransportStream } from '../stream';
import { isBuffer } from '../utils';
import { ProtocolClientOpts } from './options';
import { TransportRequest } from './request';
import { ErrorResponse, TransportEvent, TransportResponse } from './response';


/**
 * transport protocol backend.
 */
@Injectable()
export class ProtocolBackend implements EndpointBackend<TransportRequest, TransportEvent> {

    constructor() {

    }

    handle(req: TransportRequest, ctx: RequestContext): Observable<TransportEvent> {
        const stream = ctx.get(TransportStream);
        const { id, url } = req;
        if (!stream || stream.destroyed) return throwError(() => new ErrorResponse({
            id,
            url,
            status: 0,
            statusMessage: 'has not connected.'
        }));
        const adapter = ctx.protocol.status;

        const opts = ctx.target.getOptions() as ProtocolClientOpts;
        const ac = this.getAbortSignal(ctx);
        return new Observable((observer: Observer<any>) => {

            let headers: OutgoingHeaders;
            let body: any, error: any, ok = false;
            let bodybuf: any[] = [];
            let bodyBetys = 0;
            let status: number;
            let statusText: string;
            let bodyLen = 0;

            if (ctx.protocol.isEvent(req)) {
                stream.readPacket().pipe(
                    filter(pk => pk.id === id)
                ).subscribe({
                    complete: () => observer.complete(),
                    error: (err) => observer.error(new ErrorResponse({
                        id,
                        url,
                        status: err?.status ?? 0,
                        statusMessage: err?.text,
                        error: err
                    })),
                    next: (pk) => {
                        if (pk.headers) {
                            headers = pk.headers;
                            const len = headers[hdr.CONTENT_LENGTH] as number ?? 0;
                            const hdrcode = headers[hdr.CONTENT_ENCODING] as string || identity;
                            if (len && hdrcode === identity) {
                                bodyLen = ~~len
                            }
                            if (opts.sizeLimit && len > opts.sizeLimit) {
                                const pipe = ctx.get(BytesPipe);
                                const msg = `Packet size limit ${pipe.transform(opts.sizeLimit)}, this response packet size ${pipe.transform(len)}`;
                                stream.emit(ev.ERROR, msg);
                                observer.error(new ErrorResponse({
                                    id,
                                    url,
                                    status: 0,
                                    statusMessage: 'Packet size limit ' + opts.sizeLimit
                                }))
                            }
                            status = headers[hdr.STATUS] as number ?? 0;
                            statusText = headers[hdr.STATUS_MESSAGE] as string ?? adapter.message(status);
                            ok = adapter.isOk(status);
                            if (adapter.isEmpty(status)) {
                                if (ok) {
                                    observer.next(new TransportResponse({
                                        id,
                                        url,
                                        headers,
                                        status,
                                        statusText
                                    }));
                                    observer.complete();
                                } else {
                                    observer.error(new ErrorResponse({
                                        id,
                                        url,
                                        status,
                                        statusText
                                    }))
                                }
                                return;
                            }

                            if (!bodyLen && ctx.protocol.status.isRedirect(status)) {
                                return ctx.get(Redirector).redirect(ctx, req, status, new ResHeaders(headers))
                                    .subscribe(observer);
                            }
                            return;
                        }


                        body = isBuffer(pk.body) ? pk.body : Buffer.from(pk.body)
                        bodybuf.push(body);
                        bodyBetys += body.length;

                        if (bodyLen > bodyBetys) {
                            return;
                        }

                        const buffer = Buffer.concat(bodybuf, bodyBetys);
                        bodybuf = [];
                        bodyBetys = 0;


                        let originalBody: string;
                        switch (ctx.responseType) {
                            case 'arraybuffer':
                                body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                                ok = true;
                                break;
                            case 'blob':
                                body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)]);
                                ok = true;
                                break;
                            case 'json':
                                body = originalBody = new TextDecoder().decode(buffer);
                                try {
                                    body = body.replace(XSSI_PREFIX, '');
                                    // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                    body = body !== '' ? JSON.parse(body) : null;
                                } catch (err) {
                                    // Since the JSON.parse failed, it's reasonable to assume this might not have been a
                                    // JSON response. Restore the original body (including any XSSI prefix) to deliver
                                    // a better error response.
                                    body = originalBody;

                                    // If this was an error request to begin with, leave it as a string, it probably
                                    // just isn't JSON. Otherwise, deliver the parsing error to the user.
                                    if (ok) {
                                        // Even though the response status was 2xx, this is still an error.
                                        ok = false;
                                        // The parse error contains the text of the body that failed to parse.
                                        error = { error: err, text: body } as ResponseJsonParseError
                                    }
                                }
                                break;
                            case 'text':
                            default:
                                body = new TextDecoder().decode(buffer);
                        }

                        if (ctx.protocol.status.isRedirect(status)) {
                            return ctx.get(Redirector).redirect(ctx, req, status, new ResHeaders(headers))
                                .subscribe(observer);
                        }

                        if (ok) {
                            observer.next(new TransportResponse({
                                id,
                                url,
                                ok,
                                headers,
                                body,
                                status,
                                statusText
                            }));
                            observer.complete();
                        } else {
                            observer.error(new ErrorResponse({
                                id,
                                url,
                                error,
                                status,
                                statusText
                            }));
                        }
                    }
                });

                if (!req.headers.has(hdr.ACCEPT)) {
                    req.headers.set(hdr.ACCEPT, 'application/json, text/plain, */*');
                }
            }
            if (opts.sizeLimit && (parseInt(req.headers.get(hdr.CONTENT_LENGTH) as string ?? '0')) > opts.sizeLimit) {
                observer.error(new ErrorResponse({
                    id,
                    url,
                    status: 0,
                    statusMessage: 'Packet size limit ' + opts.sizeLimit
                }))
            }

            stream.write(req);

            if (ctx.protocol.isEvent(req)) {
                observer.complete();
            }


            return () => {
                if (ac && !ctx.destroyed) {
                    ac.abort()
                }
                if (!ctx.destroyed) {
                    observer.error(new ErrorResponse({
                        id,
                        url,
                        status: 0,
                        statusMessage: 'The operation was aborted.'
                    }));
                }
            }
        });
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }
}

const XSSI_PREFIX = /^\)\]\}',?\n/;



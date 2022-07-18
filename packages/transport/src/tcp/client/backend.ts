import { EndpointBackend, mths, RequestContext, ResHeaderType, ResponseJsonParseError } from '@tsdi/core';
import { Injectable, InvocationContext, type_undef } from '@tsdi/ioc';
import { Socket } from 'net';
import { filter, Observable, Observer, throwError } from 'rxjs';
import { ev, hdr, identity } from '../../consts';
import { isBuffer } from '../../utils';
import { PacketProtocol } from '../packet';
import { TcpClientOpts } from './options';
import { TcpRequest } from './request';
import { TcpErrorResponse, TcpEvent, TcpResponse } from './response';

/**
 * tcp backend.
 */
@Injectable()
export class TcpBackend implements EndpointBackend<TcpRequest, TcpEvent> {

    constructor(private option: TcpClientOpts) {

    }

    handle(req: TcpRequest, ctx: RequestContext): Observable<TcpEvent> {
        const socket = ctx.get(Socket);
        const { id, url } = req;
        if (!socket) return throwError(() => new TcpErrorResponse({
            id,
            url,
            status: 0,
            statusMessage: 'has not connected.'
        }));
        const adapter = ctx.adapter;
        const ac = this.getAbortSignal(ctx);
        return new Observable((observer: Observer<any>) => {

            let headers: Record<string, ResHeaderType>;
            let body: any, error: any, ok = false;
            let bodybuf: any[] = [];
            let bodyBetys = 0;
            let status: number;
            let statusText: string;
            let bodyType: string, bodyLen = 0;

            const protocol = ctx.get(PacketProtocol);

            if (req.method !== mths.EVENT) {
                protocol.read(socket).pipe(
                    filter(pk => pk.id === id)
                ).subscribe({
                    complete: () => observer.complete(),
                    error: (err) => observer.error(new TcpErrorResponse({
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
                            if (this.option.sizeLimit && len > this.option.sizeLimit) {
                                const msg = 'Packet size limit ' + this.option.sizeLimit;
                                socket.emit(ev.ERROR, msg);
                                observer.error(new TcpErrorResponse({
                                    id,
                                    url,
                                    status: 0,
                                    statusMessage: 'Packet size limit ' + this.option.sizeLimit
                                }))
                            }
                            bodyType = headers[hdr.CONTENT_TYPE] as string;
                            status = headers[hdr.STATUS] as number ?? 0;
                            statusText = headers[hdr.STATUS_MESSAGE] as string ?? adapter.message(status);
                            ok = adapter.isOk(status);
                            if (adapter.isEmpty(status)) {
                                if (ok) {
                                    observer.next(new TcpResponse({
                                        id,
                                        url,
                                        headers,
                                        status,
                                        statusText
                                    }));
                                    observer.complete();
                                } else {
                                    observer.error(new TcpErrorResponse({
                                        id,
                                        url,
                                        status,
                                        statusText
                                    }))
                                }
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


                        if (ok) {
                            observer.next(new TcpResponse({
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
                            observer.error(new TcpErrorResponse({
                                id,
                                url,
                                error,
                                status,
                                statusText
                            }));
                        }
                    }
                });

                if (!req.hasHeader(hdr.ACCEPT)) {
                    req.setHeader(hdr.ACCEPT, 'application/json, text/plain, */*');
                }
            }

            if (this.option.sizeLimit && (req.getHeader(hdr.CONTENT_LENGTH) as number ?? 0) > this.option.sizeLimit) {
                observer.error(new TcpErrorResponse({
                    id,
                    url,
                    status: 0,
                    statusMessage: 'Packet size limit ' + this.option.sizeLimit
                }))
            }
            protocol.write(socket, req.serializePacket());

            if (req.method === mths.EVENT) {
                observer.complete();
            }


            return () => {
                if (ac && !ctx.destroyed) {
                    ac.abort()
                }
                if (!ctx.destroyed) {
                    observer.error(new TcpErrorResponse({
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
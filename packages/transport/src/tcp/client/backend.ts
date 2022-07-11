import { Decoder, Encoder, EndpointBackend, EndpointContext, Packet, RequestContext, ResponseJsonParseError, TransportError } from '@tsdi/core';
import { Injectable, InvocationContext, isDefined, isString, type_undef } from '@tsdi/ioc';
import { Logger } from '@tsdi/logs';
import { Socket } from 'net';
import { defer, filter, mergeMap, Observable, Observer, throwError } from 'rxjs';
import { ev, hdr } from '../../consts';
import { ResHeaderItemType } from '../../headers';
import { writeSocket } from '../../utils';
import { TcpClientOptions } from './options';
import { TcpRequest } from './request';
import { TcpErrorResponse, TcpEvent, TcpResponse } from './response';

/**
 * tcp backend.
 */
@Injectable()
export class TcpBackend implements EndpointBackend<TcpRequest, TcpEvent> {

    private source!: Observable<Packet>;
    private preSocket?: Socket;

    constructor(private option: TcpClientOptions) {

    }


    handle(req: TcpRequest, ctx: RequestContext): Observable<TcpEvent> {
        const socket = ctx.get(Socket);
        if(this.preSocket != socket) {
            this.source = this.createSource(socket, ctx);
        }
        if (!socket) return throwError(() => new TcpErrorResponse(0, 'has not connected.'));
        let headers: Record<string, ResHeaderItemType>;
        let body: any, error: any, ok = false;
        let bodybuf = '';
        let status: number;
        let statusMessage = '';
        let bodyType: string, bodyLen = 0;

        const ac = this.getAbortSignal(ctx);
        return new Observable((observer: Observer<any>) => {

            const sub = defer(async () => {
                const encoder = ctx.get(Encoder);
                const buf = encoder.encode(req.serializeHeader());
                const split = ctx.get(TcpClientOptions).headerSplit;

                await writeSocket(socket, buf, split, this.option.encoding);

                if (isDefined(req.body)) {
                    await writeSocket(socket, encoder.encode(req.serializeBody()), split, this.option.encoding)
                }
            }).pipe(
                mergeMap(() => this.source),
                filter(pk => pk.id === req.id)
            ).subscribe({
                complete: () => observer.complete(),
                error: (err) => observer.error(new TcpErrorResponse(err?.status ?? 500, err?.text, err ?? body)),
                next: (pk) => {
                    if (pk.headers) {
                        headers = pk.headers;
                        bodyLen = headers[hdr.CONTENT_LENGTH] as number ?? 0;
                        bodyType = headers[hdr.CONTENT_TYPE] as string;
                        status = headers[hdr.STATUS] as number ?? 0;
                        statusMessage = headers[hdr.STATUS_MESSAGE] as string;
                        if (!bodyLen) {
                            observer.next(new TcpResponse({
                                id: pk.id,
                                status,
                                statusMessage
                            }));
                            observer.complete();
                        }
                        return;
                    }
                    if (pk.body) {
                        bodybuf += pk.body;
                        if (bodyLen > Buffer.byteLength(bodybuf)) {
                            return;
                        }
                    }
                    body = bodybuf;

                    let buffer: Buffer;
                    let originalBody: string;
                    switch (ctx.responseType) {
                        case 'arraybuffer':
                            buffer = Buffer.from(body);
                            body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                            ok = true;
                            break;
                        case 'blob':
                            buffer = Buffer.from(body);
                            body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)]);
                            ok = true;
                            break;
                        case 'json':
                            originalBody = body;
                            try {
                                body = body.replace(XSSI_PREFIX, '');
                                // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                body = body !== '' ? JSON.parse(body) : null
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
                    }


                    if (ok) {
                        observer.next(new TcpResponse({
                            status,
                            statusMessage,
                            body
                        }));
                        observer.complete();
                    } else {
                        observer.error(new TcpErrorResponse(error?.status ?? 500, error?.text, error ?? body));
                    }
                }
            });

            return () => {
                if (ac && !ctx.destroyed) {
                    ac.abort()
                }
                sub && sub.unsubscribe();
                if (!ctx.destroyed) {
                    observer.error(new TcpErrorResponse(0, 'The operation was aborted.'));
                }
            }
        });
    }

    private createSource(socket: Socket, context: EndpointContext): Observable<Packet> {
        const logger = context.get(Logger);
        const decoder = context.get(Decoder);
        return new Observable((observer: Observer<any>) => {
            const onClose = (err?: any) => {
                this.preSocket = null!;
                if (err) {
                    observer.error(new TcpErrorResponse(500, err));
                } else {
                    observer.complete();
                    logger.info(socket.address(), 'closed');
                }
            }

            const onError = (err: any) => {
                this.preSocket = null!;
                if (err.code !== ev.ECONNREFUSED) {
                    logger.error(err);
                }
                observer.error(new TcpErrorResponse(500, err.message));
            };

            let buffer = '';
            let length = -1;
            const headerSplit = this.option.headerSplit!;
            const onData = (data: Buffer | string) => {
                try {
                    buffer += (isString(data) ? data : new TextDecoder().decode(data));
                    if (length === -1) {
                        const i = buffer.indexOf(headerSplit);
                        if (i !== -1) {
                            const rawContentLength = buffer.substring(0, i);
                            length = parseInt(rawContentLength, 10);

                            if (isNaN(length)) {
                                length = -1;
                                buffer = '';
                                throw new TransportError('socket packge error length' + rawContentLength);
                            }
                            buffer = buffer.substring(i + 1);
                        }
                    }
                    let body: any;
                    let rest: string | undefined;
                    if (length >= 0) {
                        const buflen = buffer.length;
                        if (length === buflen) {
                            body = buffer;
                        } else if (buflen > length) {
                            body = buffer.substring(0, length);
                            rest = buffer.substring(length);
                        }
                    }
                    if (body) {
                        body = decoder.decode(body);
                        buffer = '';
                        observer.next(body);
                    }
                    if (rest) {
                        onData(rest);
                    }
                } catch (err: any) {
                    socket.emit(ev.ERROR, err.message);
                    socket.end();
                    observer.error(new TcpErrorResponse(err.status ?? 500, err.message));
                }
            };

            const onEnd = () => {
                this.preSocket = null!;
                observer.complete();
            };

            socket.on(ev.CLOSE, onClose);
            socket.on(ev.ERROR, onError);
            socket.on(ev.ABOUT, onError);
            socket.on(ev.TIMEOUT, onError);
            socket.on(ev.DATA, onData);
            socket.on(ev.END, onEnd);

            return () => {
                socket.off(ev.DATA, onData);
                socket.off(ev.END, onEnd);
                socket.off(ev.ERROR, onError);
                socket.off(ev.ABOUT, onError);
                socket.off(ev.TIMEOUT, onError);
                socket.emit(ev.CLOSE);
            }
        });
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }
}

const XSSI_PREFIX = /^\)\]\}',?\n/;

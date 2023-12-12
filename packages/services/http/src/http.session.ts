import { Injectable, Injector, InvocationContext, Optional, isDefined, isNil, promisify } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    HttpStatusCode, IReadableStream, InvalidJsonException, ctype, XSSI_PREFIX, ev, hdr,
    Packet, ResponseEventFactory, ResponsePacket, StatusAdapter, StreamAdapter, TransportOpts, statusMessage,
    IncomingAdapter, OutgoingAdapter, MimeAdapter, FileAdapter, AssetTransportOpts, PacketLengthException
} from '@tsdi/common';
import { HttpEvent, HttpRequest } from '@tsdi/common/http';
import { ClientTransportSession, ClientTransportSessionFactory, RequestEncoder, ResponseDecoder } from '@tsdi/common/client';
import { OutgoingEncoder, IncomingDecoder, ServerTransportSession, ServerTransportSessionFactory, TransportContext, ServerOpts } from '@tsdi/endpoints';
import { Server, request as httpRequest, IncomingMessage, ClientRequest, OutgoingHttpHeaders } from 'http';
import { Server as HttpsServer, request as httpsRequest } from 'https';
import { Http2Server, ClientHttp2Session, ClientHttp2Stream, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, finalize, fromEvent, map, mergeMap, share, throwError } from 'rxjs';
import { HttpServRequest, HttpServResponse } from './server/context';
import { HttpClientOpts } from './client/options';



export type ResponseMsg = IncomingMessage | {
    headers: IncomingHttpHeaders & IncomingHttpStatusHeader,
    stream: ClientHttp2Stream
}

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = constants;

const httptl = /^https?:\/\//i;
const secureExp = /^https:/;

export class HttpClientTransportSession implements ClientTransportSession<ClientHttp2Session | null, HttpRequest> {

    readonly options: TransportOpts;
    constructor(
        readonly injector: Injector,
        readonly socket: ClientHttp2Session | null,
        readonly statusAdapter: StatusAdapter | null,
        readonly incomingAdapter: IncomingAdapter | null,
        readonly outgoingAdapter: OutgoingAdapter | null,
        readonly mimeAdapter: MimeAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly eventFactory: ResponseEventFactory,
        readonly encoder: RequestEncoder,
        readonly decoder: ResponseDecoder,
        readonly clientOpts: HttpClientOpts) {
        this.options = clientOpts.transportOpts ?? {};
    }
    delimiter?: Buffer | undefined;
    headDelimiter?: Buffer | undefined;

    existHeader = true;

    generatePacket(req: HttpRequest, noPayload?: boolean): Packet<any> {
        const pkg: any = {
            url: req.urlWithParams,
            headers: req.headers.getHeaders()
        };

        if (req.method) {
            pkg.method = req.method;
        }
        if (req.headers.size) {
            pkg.headers = req.headers.getHeaders()
        }
        if (!noPayload && isDefined(req.body)) {
            pkg.payload = req.body;
        }
        if (!pkg.headers[hdr.CONTENT_TYPE]) pkg.headers[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();

        return pkg;
    }

    send(req: HttpRequest): Observable<ClientHttp2Stream | ClientRequest> {
        let path = req.url ?? '';
        const ac = this.getAbortSignal(req.context);
        let stream: ClientHttp2Stream | ClientRequest;
        if (this.clientOpts.authority && this.socket && (!httptl.test(path) || path.startsWith(this.clientOpts.authority))) {
            path = path.replace(this.clientOpts.authority, '');

            const reqHeaders = req.headers.getHeaders() ?? {} as OutgoingHttpHeaders;

            if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = path;

            stream = this.socket.request(reqHeaders, { abort: ac?.signal, ...this.clientOpts.requestOptions } as ClientSessionRequestOptions);

        } else {
            const headers = req.headers ?? {};


            const option = {
                method: req.method,
                headers: {
                    'accept': ctype.REQUEST_ACCEPT,
                    ...headers,
                },
                abort: ac?.signal
            };

            stream = secureExp.test(path) ? httpsRequest(path, option) : httpRequest(path, option);

        }

        return this.encoder.handle({ req, session: this })
            .pipe(
                mergeMap(async data => {
                    if (isNil(data)) await promisify(stream.end, stream)();
                    if (this.streamAdapter.isReadable(data)) await this.streamAdapter.pipeTo(data, stream);
                    return stream;
                })
            )
    }

    serialize(packet: Packet): Buffer {
        return Buffer.from(JSON.stringify(packet));
    }


    deserialize(raw: Buffer): Packet<any> {
        let src = new TextDecoder().decode(raw);
        try {
            src = src.replace(XSSI_PREFIX, '');
            return src !== '' ? JSON.parse(src) : null
        } catch (err) {
            throw new InvalidJsonException(err, src)
        }
    }

    request(req: HttpRequest): Observable<HttpEvent> {
        return this.send(req)
            .pipe(
                mergeMap(stream => {
                    if (stream instanceof ClientRequest) {
                        return new Observable<ResponseMsg>(subscribe => {
                            const onResponse = (resp: IncomingMessage) => subscribe.next(resp);
                            const onError = (err: any) => err && subscribe.error(err);
                            stream.on(ev.CLOSE, onError);
                            stream.on(ev.ERROR, onError);
                            stream.on(ev.ABOUT, onError);
                            stream.on(ev.TIMEOUT, onError);
                            stream.on(ev.RESPONSE, onResponse);

                            return () => {
                                stream.off(ev.CLOSE, onError);
                                stream.off(ev.ERROR, onError);
                                stream.off(ev.ABOUT, onError);
                                stream.off(ev.TIMEOUT, onError);
                                stream.off(ev.RESPONSE, onResponse);
                                subscribe.unsubscribe();
                            }
                        })
                    } else {
                        return fromEvent(stream, ev.RESPONSE, (headers) => ({ headers, stream })) as Observable<ResponseMsg>;
                    }
                }),
                mergeMap(msg => {
                    let headPkg: ResponsePacket;
                    let stream: IReadableStream;
                    if (msg instanceof IncomingMessage) {
                        const { headers, statusCode, statusMessage, httpVersion, httpVersionMinor } = msg;
                        headPkg = {
                            headers,
                            status: statusCode,
                            statusText: statusMessage,
                            httpVersion,
                            httpVersionMinor
                        } as ResponsePacket;
                        stream = msg
                    } else {
                        const status = (msg.headers[hdr.STATUS2] ?? 200) as HttpStatusCode;
                        headPkg = {
                            status,
                            statusText: (msg.headers[hdr.STATUS_MESSAGE] || statusMessage[status]) as string,
                            headers: msg.headers
                        };
                        stream = msg.stream;
                    }
                    // const ctx = new Context(this.injector, this, stream, headPkg);
                    return this.decoder.handle({ packet: headPkg, req, session: this })
                        .pipe(
                            map(res => {
                                return res as HttpEvent
                            }),
                            finalize(() => {
                                if (stream && req.observe !== 'observe') stream.destroy?.();
                            })
                        );
                })
            )

    }

    protected getAbortSignal(ctx?: InvocationContext): AbortController {
        return !ctx || typeof AbortController === 'undefined' ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }

    async destroy(): Promise<void> {
        if (this.socket) {
            await promisify(this.socket.close, this.socket)();
        }
    }

}

@Injectable()
export class HttpClientSessionFactory implements ClientTransportSessionFactory<ClientHttp2Session | null> {

    constructor(
        readonly injector: Injector,
        @Optional() private statusAdapter: StatusAdapter,
        @Optional() private incomingAdapter: IncomingAdapter,
        @Optional() private outgoingAdapter: OutgoingAdapter,
        @Optional() private mimeAdapter: MimeAdapter,
        private streamAdapter: StreamAdapter,
        private eventFactory: ResponseEventFactory,
        private encoder: RequestEncoder,
        private decoder: ResponseDecoder) {

    }

    create(socket: ClientHttp2Session | null, options: HttpClientOpts): HttpClientTransportSession {
        return new HttpClientTransportSession(this.injector,
            socket,
            this.statusAdapter,
            this.incomingAdapter,
            this.outgoingAdapter,
            this.mimeAdapter,
            this.streamAdapter,
            this.eventFactory,
            this.encoder,
            this.decoder,
            options);
    }

}


export interface RequestMsg {
    req: HttpServRequest,
    res: HttpServResponse
}

export class HttpServerTransportSession implements ServerTransportSession<Http2Server | HttpsServer | Server> {
    constructor(
        readonly injector: Injector,
        readonly socket: Http2Server | HttpsServer | Server,
        readonly statusAdapter: StatusAdapter | null,
        readonly incomingAdapter: IncomingAdapter | null,
        readonly outgoingAdapter: OutgoingAdapter | null,
        readonly mimeAdapter: MimeAdapter | null,
        readonly fileAdapter: FileAdapter,
        readonly streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder,
        readonly options: TransportOpts) {

    }

    delimiter?: Buffer | undefined;
    headDelimiter?: Buffer | undefined;

    existHeader = true;

    generatePacket(msg: TransportContext<any, any, any>, noPayload?: boolean | undefined): Packet<any> {
        return {
            // id; 
            headers: msg.response.headers,
            payload: noPayload ? null : msg.body
        }
    }

    send(ctx: TransportContext): Observable<any> {
        const len = ctx.length;
        if (len) {
            const opts = this.options as AssetTransportOpts;
            if (opts.payloadMaxSize && len > opts.payloadMaxSize) {
                const byfmt = this.injector.get<PipeTransform>('bytes-format');
                return throwError(() => new PacketLengthException(`Payload length ${byfmt.transform(len)} great than max size ${byfmt.transform(opts.payloadMaxSize)}`));
            }
        }

        return this.encoder.handle(ctx)
            .pipe(
                mergeMap(data => {
                    const res = ctx.response;
                    if (isNil(data)) return this.writeHeader(ctx);
                    if (this.streamAdapter.isReadable(data)) return this.streamAdapter.pipeTo(data, ctx.response);
                    return this.writeMessage(data, ctx);
                })
            )
    }

    private writeHeader(ctx: TransportContext): Promise<void> {
        const res = ctx.response;
        return promisify<void>(res.end, res)();
    }

    writeMessage(chunk: Buffer, ctx: TransportContext<any, any, any>): Promise<void> {
        const res = ctx.response;
        return promisify<Buffer, void>(res.end, res)(chunk);
    }

    write(packet: ResponsePacket, chunk: Buffer, callback?: (err?: any) => void): void {
        throw new Error('Method not implemented.');
    }

    serialize(packet: Packet): Buffer {
        return Buffer.from(JSON.stringify(packet));
    }

    deserialize(raw: Buffer): Packet<any> {
        let src = new TextDecoder().decode(raw);
        try {
            src = src.replace(XSSI_PREFIX, '');
            return src !== '' ? JSON.parse(src) : null
        } catch (err) {
            throw new InvalidJsonException(err, src)
        }
    }


    receive(options: ServerOpts): Observable<TransportContext> {

        return new Observable<RequestMsg>(subscribe => {
            const onRequest = (req: HttpServRequest, res: HttpServResponse) => subscribe.next({ req, res } as RequestMsg);
            const onError = (err: any) => err && subscribe.error(err);
            this.socket.on(ev.CLOSE, onError);
            this.socket.on(ev.ERROR, onError);
            this.socket.on(ev.ABOUT, onError);
            this.socket.on(ev.TIMEOUT, onError);
            this.socket.on(ev.REQUEST, onRequest);

            return () => {
                this.socket.off(ev.CLOSE, onError);
                this.socket.off(ev.ERROR, onError);
                this.socket.off(ev.ABOUT, onError);
                this.socket.off(ev.TIMEOUT, onError);
                this.socket.off(ev.REQUEST, onRequest);
                subscribe.unsubscribe();
            }
        }).pipe(
            mergeMap(msg => {
                const packet = { ...msg };
                return this.decoder.handle({ session: this, packet, options })
            }),
            share()
        );
    }

    async destroy(): Promise<void> {

    }

}

@Injectable()
export class HttpServerSessionFactory implements ServerTransportSessionFactory<Http2Server | HttpsServer | Server> {

    constructor(
        readonly injector: Injector,
        @Optional() private statusAdapter: StatusAdapter,
        @Optional() private incomingAdapter: IncomingAdapter,
        @Optional() private outgoingAdapter: OutgoingAdapter,
        @Optional() private mimeAdapter: MimeAdapter,
        private fileAdapter: FileAdapter,
        readonly streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder) {

    }

    create(socket: Http2Server | HttpsServer | Server, options: TransportOpts): HttpServerTransportSession {
        return new HttpServerTransportSession(this.injector,
            socket,
            this.statusAdapter,
            this.incomingAdapter,
            this.outgoingAdapter,
            this.mimeAdapter,
            this.fileAdapter,
            this.streamAdapter,
            this.encoder,
            this.decoder,
            options);
    }

}

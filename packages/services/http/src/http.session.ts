import { Injectable, Injector, InvocationContext, isNil, promisify } from '@tsdi/ioc';
import { HttpStatusCode, TransportRequest, statusMessage } from '@tsdi/common';
import {
    Decoder, Encoder, IReadableStream, InvalidJsonException, Packet,
    ResponsePacket, StreamAdapter, TransportOpts, ev
} from '@tsdi/common/transport';
import { TransportSession } from '@tsdi/endpoints';
import { Server, request as httpRequest, IncomingMessage, ClientRequest } from 'http';
import { Server as HttpsServer, request as httpsRequest } from 'https';
import { Http2Server, ClientHttp2Session, ClientHttp2Stream, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, defer, fromEvent, map, mergeMap, share } from 'rxjs';
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

export class HttpClientTransportSession implements TransportSession<ClientHttp2Session | null> {

    readonly options: TransportOpts;
    constructor(
        readonly injector: Injector,
        readonly socket: ClientHttp2Session | null,
        readonly streamAdapter: StreamAdapter,
        readonly encoder: Encoder,
        readonly decoder: Decoder,
        readonly clientOpts: HttpClientOpts) {
        this.options = clientOpts.transportOpts ?? {};
    }

    receive(packet?: Packet<any> | undefined): Observable<Packet<any>> {
        throw new Error('Method not implemented.');
    }

    getPacketStrategy(): string | undefined {
        return this.encoder.strategy ?? this.decoder.strategy
    }

    send(req: TransportRequest, context?: InvocationContext): Observable<ClientHttp2Stream | ClientRequest> {
        let path = req.url ?? '';
        const ac = this.getAbortSignal(context);
        let stream: ClientHttp2Stream | ClientRequest;
        if (this.clientOpts.authority && this.socket && (!httptl.test(path) || path.startsWith(this.clientOpts.authority))) {
            path = path.replace(this.clientOpts.authority, '');

            const reqHeaders = req.headers.getHeaders() ?? {};

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

        return defer(async () => {
            if (isNil(req.payload)) {
                await promisify(stream.end, stream)();
            } else {
                await promisify(this.streamAdapter.sendbody, this.streamAdapter)(req.payload, stream)
            }
            return stream;
        });
    }

    serialize(packet: Packet<any>, withPayload?: boolean | undefined): Buffer {
        let pkg: Packet;
        if (withPayload) {
            const { length, ...data } = packet;
            pkg = data;
        } else {
            const { payload, ...headers } = packet;
            pkg = headers;
        }
        try {
            return Buffer.from(JSON.stringify(pkg))
        } catch (err) {
            throw new InvalidJsonException(err, String(pkg))
        }
    }

    deserialize(raw: Buffer): Packet<any> {
        const jsonStr = new TextDecoder().decode(raw);
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }

    request(req: TransportRequest, context: InvocationContext): Observable<ResponsePacket<any>> {
        return this.send(req, context)
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
                            statusMessage: statusMessage,
                            httpVersion,
                            httpVersionMinor
                        } as ResponsePacket;
                        stream = msg
                    } else {
                        const status = (msg.headers[hdr.STATUS2] ?? 200) as HttpStatusCode;
                        headPkg = {
                            status,
                            statusMessage: (msg.headers[hdr.STATUS_MESSAGE] || statusMessage[status]) as string,
                            headers: msg.headers
                        };
                        stream = msg.stream;
                    }
                    const ctx = new Context(this.injector, this, stream, headPkg);
                    return this.decoder.handle(ctx)
                        .pipe(
                            map((pkg: ResponsePacket) => {
                                pkg.stream = stream;
                                return pkg;
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
export class HttpClientSessionFactory implements TransportSessionFactory<ClientHttp2Session | null> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: Encoder,
        private decoder: Decoder) {

    }

    create(socket: ClientHttp2Session | null, options: HttpClientOpts): HttpClientTransportSession {
        return new HttpClientTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}


export interface RequestMsg {
    req: HttpServRequest,
    res: HttpServResponse
}

export class HttpServerTransportSession implements TransportSession<Http2Server | HttpsServer | Server> {
    constructor(
        readonly injector: Injector,
        readonly socket: Http2Server | HttpsServer | Server,
        readonly streamAdapter: StreamAdapter,
        private encoder: Encoder,
        private decoder: Decoder,
        readonly options: TransportOpts) {

    }

    getPacketStrategy(): string | undefined {
        return this.encoder.strategy ?? this.decoder.strategy
    }

    send(packet: ResponsePacket<any>): Observable<any> {
        const ctx = new Context(this.injector, this, packet);
        return this.encoder.handle(ctx);
    }

    serialize(packet: Packet<any>, withPayload?: boolean | undefined): Buffer {
        let pkg: Packet;
        if (withPayload) {
            const { length, ...data } = packet;
            pkg = data;
        } else {
            const { payload, ...headers } = packet;
            pkg = headers;
        }
        try {
            return Buffer.from(JSON.stringify(pkg))
        } catch (err) {
            throw new InvalidJsonException(err, String(pkg))
        }
    }

    deserialize(raw: Buffer): Packet<any> {
        const jsonStr = new TextDecoder().decode(raw);
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }

    request(packet: TransportRequest<any>, context?: InvocationContext<any> | undefined): Observable<ResponsePacket<any>> {
        throw new Error('Method not implemented.');
    }

    receive(): Observable<IncomingPacket> {

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
                const ctx = new Context(this.injector, this, msg.req, msg.req);
                return this.decoder.handle(ctx)
                    .pipe(
                        map((pkg: IncomingPacket) => {
                            pkg.res = msg.res;
                            pkg.req = msg.req;
                            return pkg;
                        })
                    );
            }),
            share()
        );
    }

    async destroy(): Promise<void> {

    }

}

@Injectable()
export class HttpServerSessionFactory implements TransportSessionFactory<Http2Server | HttpsServer | Server> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: Encoder,
        private decoder: Decoder) {

    }

    create(socket: Http2Server | HttpsServer | Server, options: TransportOpts): HttpServerTransportSession {
        return new HttpServerTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}

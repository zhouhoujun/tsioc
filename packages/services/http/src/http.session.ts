import { Injectable, Injector, InvocationContext, isNil, promisify } from '@tsdi/ioc';
import { Context, Decoder, Encoder, HeaderPacket, IReadableStream, IncomingPacket, InvalidJsonException, Packet, RequestPacket, ResponsePacket, StreamAdapter, TransportOpts, TransportSession, TransportSessionFactory, ev } from '@tsdi/common';
import { ctype } from '@tsdi/endpoints/assets';
import { Server, request as httpRequest, IncomingMessage, ClientRequest } from 'http';
import { Server as HttpsServer, request as httpsRequest } from 'https';
import { Http2Server, ClientHttp2Session, ClientHttp2Stream, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, defer, first, fromEvent, map, merge, mergeMap, share } from 'rxjs';
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

    send(req: RequestPacket, context?: InvocationContext): Observable<ClientHttp2Stream | ClientRequest> {
        let path = req.url ?? '';
        const ac = this.getAbortSignal(context);
        let stream: ClientHttp2Stream | ClientRequest;
        if (this.clientOpts.authority && this.socket && (!httptl.test(path) || path.startsWith(this.clientOpts.authority))) {
            path = path.replace(this.clientOpts.authority, '');

            const reqHeaders = req.headers ?? {};

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

    request(req: RequestPacket, context: InvocationContext): Observable<ResponsePacket<any>> {
        return this.send(req, context)
            .pipe(
                mergeMap(stream => {
                    if (stream instanceof ClientRequest) {
                        const $close = fromEvent(stream, ev.CLOSE).pipe((err) => { throw err });
                        const $error = fromEvent(stream, ev.ERROR).pipe((err) => { throw err });
                        const $about = fromEvent(stream, ev.ABOUT).pipe((err) => { throw err });
                        const $timout = fromEvent(stream, ev.TIMEOUT).pipe((err) => { throw err });
                        const $source = fromEvent(stream, ev.RESPONSE, (resp: IncomingMessage) => resp);

                        return merge($source, $close, $error, $about, $timout).pipe(first()) as Observable<ResponseMsg>;
                    } else {
                        return fromEvent(stream, ev.RESPONSE, (headers) => ({ headers, stream })) as Observable<ResponseMsg>;
                    }
                }),
                mergeMap(msg => {
                    let headPkg: HeaderPacket;
                    let stream: IReadableStream;
                    if (msg instanceof IncomingMessage) {
                        const { headers, httpVersion, httpVersionMinor } = msg;
                        headPkg = {
                            headers,
                            httpVersion,
                            httpVersionMinor
                        } as HeaderPacket;
                        stream = msg
                    } else {
                        headPkg = {
                            headers: msg.headers
                        };
                        stream = msg.stream;
                    }
                    const ctx = new Context(this.injector, this, stream, headPkg);
                    return this.decoder.handle(ctx)
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

    request(packet: RequestPacket<any>, context?: InvocationContext<any> | undefined): Observable<ResponsePacket<any>> {
        throw new Error('Method not implemented.');
    }

    receive(): Observable<IncomingPacket> {

        // const $source = fromEvent(this.socket, ev.REQUEST, (req, res) => ({ req, res } as RequestMsg))
        // const $close = fromEvent(this.socket, ev.CLOSE).pipe((err) => { throw err }) as Observable<RequestMsg>;
        // const $error = fromEvent(this.socket, ev.ERROR).pipe((err) => { throw err }) as Observable<RequestMsg>;
        // const $about = fromEvent(this.socket, ev.ABOUT).pipe((err) => { throw err }) as Observable<RequestMsg>;
        // const $timout = fromEvent(this.socket, ev.TIMEOUT).pipe((err) => { throw err }) as Observable<RequestMsg>;
        // return merge($source, $close, $error, $about, $timout).pipe(
        //     first(),

        return new Observable<RequestMsg>(subscribe => {
            const onRequest = (req: HttpServRequest, res: HttpServResponse) => subscribe.next({ req, res } as RequestMsg);
            const onError = (err: any) => err && subscribe.error(err);
            this.socket.on(ev.CLOSE, onError);
            this.socket.on(ev.TIMEOUT, onError);
            this.socket.on(ev.ERROR, onError);
            this.socket.on(ev.REQUEST, onRequest);

            return () => {
                this.socket.off(ev.CLOSE, onError);
                this.socket.off(ev.TIMEOUT, onError);
                this.socket.off(ev.ERROR, onError);
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

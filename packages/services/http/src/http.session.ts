import { Injectable, Injector, InvocationContext, isNil, promisify } from '@tsdi/ioc';
import { Context, Decoder, Encoder, HeaderPacket, IReadableStream, InvalidJsonException, Packet, RequestPacket, ResponsePacket, StreamAdapter, TransportOpts, TransportSession, TransportSessionFactory, ev, hdr } from '@tsdi/common';
import { PayloadTransportSession } from '@tsdi/endpoints';
import { ctype } from '@tsdi/endpoints/assets';
import { Server, request as httpRequest, IncomingMessage, ClientRequest } from 'http';
import { Server as HttpsServer, request as httpsRequest } from 'https';
import { Http2Server, ClientHttp2Session, ClientHttp2Stream, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, defer, first, fromEvent, merge, mergeMap } from 'rxjs';
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

// export class HttpClientSession extends PayloadTransportSession<ClientHttp2Session | null, ResponseMsg> {

//     constructor(
//         injector: Injector,
//         socket: ClientHttp2Session | null,
//         encoder: Encoder,
//         decoder: Decoder,
//         readonly clientOpts: HttpClientOpts) {
//         super(injector, socket, encoder, decoder, clientOpts.transportOpts ?? {});
//     }

//     protected beforeRequest(packet: RequestPacket<any>): Promise<void> {
//         throw new Error('Method not implemented.');
//     }


//     protected message(req: RequestPacket): Observable<ResponseMsg> {
//         let path = req.url ?? '';
//         const ac = this.getAbortSignal(req.context);
//         if (this.clientOpts.authority && this.socket && (!httptl.test(path) || path.startsWith(this.clientOpts.authority))) {
//             path = path.replace(this.clientOpts.authority, '');

//             const reqHeaders = req.headers ?? {};

//             if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
//             reqHeaders[HTTP2_HEADER_METHOD] = req.method;
//             reqHeaders[HTTP2_HEADER_PATH] = path;

//             const stream = this.socket.request(reqHeaders, { abort: ac?.signal, ...this.clientOpts.requestOptions } as ClientSessionRequestOptions);
//             return fromEvent(stream, ev.RESPONSE, (headers) => ({ headers, stream }));

//         } else {
//             const headers = req.headers ?? {};


//             const option = {
//                 method: req.method,
//                 headers: {
//                     'accept': ctype.REQUEST_ACCEPT,
//                     ...headers,
//                 },
//                 abort: ac?.signal
//             };

//             const clientReq = secureExp.test(path) ? httpsRequest(path, option) : httpRequest(path, option);
//             const $close = fromEvent(clientReq, ev.CLOSE).pipe((err) => { throw err });
//             const $error = fromEvent(clientReq, ev.ERROR).pipe((err) => { throw err });
//             const $about = fromEvent(clientReq, ev.ABOUT).pipe((err) => { throw err });
//             const $timout = fromEvent(clientReq, ev.TIMEOUT).pipe((err) => { throw err });
//             const $source = fromEvent(clientReq, ev.RESPONSE, (resp: IncomingMessage) => resp);


//             return merge($source, $close, $error, $about, $timout).pipe(first()) as Observable<ResponseMsg>;
//         }
//     }

//     protected mergeClose(source: Observable<any>): Observable<any> {
//         // const $close = fromEvent(this.socket, ev.CLOSE).pipe((err) => { throw err });
//         // const $error = fromEvent(this.socket, ev.ERROR);
//         // const $about = fromEvent(this.socket, ev.ABOUT);
//         // const $timout = fromEvent(this.socket, ev.TIMEOUT);

//         // return merge(source, $close, $error, $about, $timout).pipe(first());
//         return source;

//     }

//     protected write(data: Buffer, packet: Packet<any>): Promise<void> {
//         return promisify<Buffer, void>(this.socket.write, this.socket)(data);
//     }

//     protected getHeaders(msg: ResponseMsg): HeaderPacket | undefined {
//         return msg.req
//     }
//     protected concat(msg: ResponseMsg): Observable<Buffer> {
//         throw new Error('Method not implemented.');
//     }
//     protected getPacketId(): string | number {
//         throw new Error('Method not implemented.');
//     }

//     protected getAbortSignal(ctx?: InvocationContext): AbortController {
//         return !ctx || typeof AbortController === 'undefined' ? null! : ctx.getValueify(AbortController, () => new AbortController());
//     }

//     async destroy(): Promise<void> {
//         if (this.socket) {
//             await promisify(this.socket.close, this.socket)();
//         }
//     }
// }

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


export class HttpServerSession extends PayloadTransportSession<Http2Server | HttpsServer | Server, RequestMsg> {
    protected getHeaders(msg: RequestMsg): HeaderPacket | undefined {
        throw new Error('Method not implemented.');
    }
    protected concat(msg: RequestMsg): Observable<Buffer> {
        throw new Error('Method not implemented.');
    }
    protected getPacketId(): string | number {
        throw new Error('Method not implemented.');
    }
    destroy(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected message(): Observable<RequestMsg> {
        return fromEvent(this.socket, ev.REQUEST, (req, res) => ({ req, res }))
    }
    protected mergeClose(source: Observable<any>): Observable<any> {
        const $close = fromEvent(this.socket, ev.CLOSE).pipe((err) => { throw err });
        const $error = fromEvent(this.socket, ev.ERROR);
        const $about = fromEvent(this.socket, ev.ABOUT);
        const $timout = fromEvent(this.socket, ev.TIMEOUT);

        return merge(source, $close, $error, $about, $timout).pipe(first());
    }

    protected write(data: Buffer, packet: Packet<any>): Promise<void> {

        throw new Error('Method not implemented.');
    }

    protected beforeRequest(packet: RequestPacket<any>): Promise<void> {
        throw new Error('Method not implemented.');
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

    create(socket: Http2Server | HttpsServer | Server, options: TransportOpts): HttpServerSession {
        return new HttpServerSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}
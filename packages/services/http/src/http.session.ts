import { Injectable, Injector, InvocationContext, promisify } from '@tsdi/ioc';
import { Decoder, Encoder, HeaderPacket, Packet, RequestPacket, SendPacket, TransportOpts, TransportSessionFactory, ev, hdr } from '@tsdi/common';
import { PayloadTransportSession } from '@tsdi/endpoints';
import { ctype } from '@tsdi/endpoints/assets';
import { Server, request as httpRequest, ClientRequest, IncomingMessage } from 'http';
import { Server as HttpsServer, request as httpsRequest } from 'https';
import { Http2Server, ClientHttp2Session, ClientHttp2Stream, constants, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, first, fromEvent, merge } from 'rxjs';
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

export class HttpClientSession extends PayloadTransportSession<ClientHttp2Session | null, ResponseMsg> {

    constructor(
        injector: Injector,
        socket: ClientHttp2Session | null,
        encoder: Encoder,
        decoder: Decoder,
        readonly clientOpts: HttpClientOpts) {
        super(injector, socket, encoder, decoder, clientOpts.transportOpts ?? {});
    }

    protected beforeRequest(packet: RequestPacket<any>): Promise<void> {
        throw new Error('Method not implemented.');
    }


    protected message(req: RequestPacket): Observable<ResponseMsg> {
        let path = req.url ?? '';
        const ac = this.getAbortSignal(req.context);
        if (this.clientOpts.authority && this.socket && (!httptl.test(path) || path.startsWith(this.clientOpts.authority))) {
            path = path.replace(this.clientOpts.authority, '');

            const reqHeaders = req.headers ?? {};

            if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = path;

            const stream = this.socket.request(reqHeaders, { abort: ac?.signal, ...this.clientOpts.requestOptions } as ClientSessionRequestOptions);
            return fromEvent(stream, ev.RESPONSE, (headers) => ({ headers, stream }));

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

            const clientReq = secureExp.test(path) ? httpsRequest(path, option) : httpRequest(path, option);
            const $close = fromEvent(clientReq, ev.CLOSE).pipe((err) => { throw err });
            const $error = fromEvent(clientReq, ev.ERROR).pipe((err) => { throw err });
            const $about = fromEvent(clientReq, ev.ABOUT).pipe((err) => { throw err });
            const $timout = fromEvent(clientReq, ev.TIMEOUT).pipe((err) => { throw err });
            const $source = fromEvent(clientReq, ev.RESPONSE, (resp: IncomingMessage)=> resp);


            return merge($source, $close, $error, $about, $timout).pipe(first()) as Observable<ResponseMsg>;
        }
    }

    protected mergeClose(source: Observable<any>): Observable<any> {
        // const $close = fromEvent(this.socket, ev.CLOSE).pipe((err) => { throw err });
        // const $error = fromEvent(this.socket, ev.ERROR);
        // const $about = fromEvent(this.socket, ev.ABOUT);
        // const $timout = fromEvent(this.socket, ev.TIMEOUT);

        // return merge(source, $close, $error, $about, $timout).pipe(first());
        return source;

    }

    protected write(data: Buffer, packet: Packet<any>): Promise<void> {
        return promisify<Buffer, void>(this.socket.write, this.socket)(data);
    }

    protected getHeaders(msg: ResponseMsg): HeaderPacket | undefined {
        return msg.req
    }
    protected concat(msg: ResponseMsg): Observable<Buffer> {
        throw new Error('Method not implemented.');
    }
    protected getPacketId(): string | number {
        throw new Error('Method not implemented.');
    }

    protected getAbortSignal(ctx: InvocationContext): AbortController {
        return typeof AbortController === 'undefined' ? null! : ctx.getValueify(AbortController, () => new AbortController());
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
        private encoder: Encoder,
        private decoder: Decoder) {

    }

    create(socket: ClientHttp2Session | null, options: HttpClientOpts): HttpClientSession {
        return new HttpClientSession(this.injector, socket, this.encoder, this.decoder, options);
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
        private encoder: Encoder,
        private decoder: Decoder) {

    }

    create(socket: Http2Server | HttpsServer | Server, options: TransportOpts): HttpServerSession {
        return new HttpServerSession(this.injector, socket, this.encoder, this.decoder, options);
    }

}

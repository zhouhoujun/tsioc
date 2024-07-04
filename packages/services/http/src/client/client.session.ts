import { Injectable, Injector, InvocationContext, isNil, promisify } from '@tsdi/ioc';
import { Message, MessageFactory, UrlRequest } from '@tsdi/common';
import { CodingsContext, Decoder, DecodingsFactory, Encoder, EncodingsFactory } from '@tsdi/common/codings';
import { AbstractTransportSession, MessageReader, MessageWriter, StreamAdapter, TransportContext, TransportOpts, ctype, ev } from '@tsdi/common/transport';
import { request as httpRequest, IncomingMessage, ClientRequest } from 'http';
import { request as httpsRequest } from 'https';
import { ClientHttp2Session, ClientHttp2Stream, constants, OutgoingHttpHeaders, IncomingHttpHeaders, IncomingHttpStatusHeader, ClientSessionRequestOptions } from 'http2';
import { Observable, defer, fromEvent, takeUntil } from 'rxjs';
import { HttpClientOpts } from './options';
import { ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { HttpRequest } from '@tsdi/common/http';




export class Http2IncomingMessage {
    constructor(
        readonly headers: IncomingHttpHeaders & IncomingHttpStatusHeader,
        readonly stream: ClientHttp2Stream
    ) { }
}


const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = constants;

const httptl = /^https?:\/\//i;
const secureExp = /^https:/;

export class HttpClientMessageReader implements MessageReader {

    read(socket: ClientHttp2Session | ClientRequest, messageFactory: MessageFactory, session: AbstractTransportSession): Observable<Message> {
        if (socket instanceof ClientRequest) {
            return new Observable<Message>(subscribe => {
                const onResponse = (resp: IncomingMessage) => subscribe.next(messageFactory.create(resp));
                const onError = (err: any) => err && subscribe.error(err);
                socket.on(ev.CLOSE, onError);
                socket.on(ev.ERROR, onError);
                socket.on(ev.ABOUT, onError);
                socket.on(ev.TIMEOUT, onError);
                socket.on(ev.RESPONSE, onResponse);

                return () => {
                    socket.off(ev.CLOSE, onError);
                    socket.off(ev.ERROR, onError);
                    socket.off(ev.ABOUT, onError);
                    socket.off(ev.TIMEOUT, onError);
                    socket.off(ev.RESPONSE, onResponse);
                    subscribe.unsubscribe();
                }
            })
        } else {
            return fromEvent(socket, ev.RESPONSE, (headers) => messageFactory.create({ headers, data: socket }));
        }
    }
}

export class HttpClientMessageWriter implements MessageWriter<ClientHttp2Session | null, Message, HttpRequest<any>, ClientTransportSession> {

    write(socket: ClientHttp2Session | null, msg: Message, req: HttpRequest<any>, session: ClientTransportSession): Promise<any> {
        let path = req.url ?? '';
        const clientOpts = session.clientOptions as HttpClientOpts;
        const ac = this.getAbortSignal(context);
        let stream: ClientHttp2Stream | ClientRequest;
        if (clientOpts.authority && socket && (!httptl.test(path) || path.startsWith(clientOpts.authority))) {
            path = path.replace(clientOpts.authority, '');

            const reqHeaders = (req.headers.getHeaders() ?? {}) as OutgoingHttpHeaders;

            if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = path;

            stream = socket.request(reqHeaders, { abort: ac?.signal, ...clientOpts.requestOptions } as ClientSessionRequestOptions);

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
            if (isNil(msg)) {
                await promisify(stream.end, stream)();
            } else {
                await this.streamAdapter.sendBody(msg, stream);
            }
            return stream;
        });
    }

}



// export class HttpClientTransportSession extends ClientTransportSession<ClientHttp2Session | null> {

//     readonly options: TransportOpts
//     constructor(
//         readonly injector: Injector,
//         readonly socket: ClientHttp2Session | null,
//         readonly streamAdapter: StreamAdapter,
//         readonly encodings: Encoder,
//         readonly decodings: Decoder,
//         readonly clientOpts: HttpClientOpts
//     ) {
//         super();
//         this.options = clientOpts.transportOpts ?? {};
//     }



//     override sendMessage(msg: any, req: UrlRequest, ctx: CodingsContext): Observable<any> {
//         let path = req.url ?? '';
//         const context = req.context;
//         const ac = this.getAbortSignal(context);
//         let stream: ClientHttp2Stream | ClientRequest;
//         if (this.clientOpts.authority && this.socket && (!httptl.test(path) || path.startsWith(this.clientOpts.authority))) {
//             path = path.replace(this.clientOpts.authority, '');

//             const reqHeaders = (req.headers.getHeaders() ?? {}) as OutgoingHttpHeaders;

//             if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
//             reqHeaders[HTTP2_HEADER_METHOD] = req.method;
//             reqHeaders[HTTP2_HEADER_PATH] = path;

//             stream = this.socket.request(reqHeaders, { abort: ac?.signal, ...this.clientOpts.requestOptions } as ClientSessionRequestOptions);

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

//             stream = secureExp.test(path) ? httpsRequest(path, option) : httpRequest(path, option);

//         }

//         return defer(async () => {
//             if (isNil(msg)) {
//                 await promisify(stream.end, stream)();
//             } else {
//                 await this.streamAdapter.sendBody(msg, stream);
//             }
//             return stream;
//         });
//     }

//     override handleMessage(context: TransportContext): Observable<HttpClientIncomingMessage> {
//         const stream = context.last() as ClientHttp2Stream | ClientRequest;
//         if (stream instanceof ClientRequest) {
//             return new Observable<HttpClientIncomingMessage>(subscribe => {
//                 const onResponse = (resp: IncomingMessage) => subscribe.next(resp);
//                 const onError = (err: any) => err && subscribe.error(err);
//                 stream.on(ev.CLOSE, onError);
//                 stream.on(ev.ERROR, onError);
//                 stream.on(ev.ABOUT, onError);
//                 stream.on(ev.TIMEOUT, onError);
//                 stream.on(ev.RESPONSE, onResponse);

//                 return () => {
//                     stream.off(ev.CLOSE, onError);
//                     stream.off(ev.ERROR, onError);
//                     stream.off(ev.ABOUT, onError);
//                     stream.off(ev.TIMEOUT, onError);
//                     stream.off(ev.RESPONSE, onResponse);
//                     subscribe.unsubscribe();
//                 }
//             }).pipe(takeUntil(this.destroy$))
//         } else {
//             return fromEvent(stream, ev.RESPONSE, (headers) => new Http2IncomingMessage(headers, stream)).pipe(takeUntil(this.destroy$));
//         }
//     }

//     protected getAbortSignal(ctx?: InvocationContext): AbortController {
//         return !ctx || typeof AbortController === 'undefined' ? null! : ctx.getValueify(AbortController, () => new AbortController());
//     }

//     // async destroy(): Promise<void> {
//     //     if (this.socket) {
//     //         await promisify(this.socket.close, this.socket)();
//     //     }
//     // }

// }

// @Injectable()
// export class HttpClientSessionFactory implements ClientTransportSessionFactory<ClientHttp2Session | null, HttpClientOpts> {

//     constructor() { }

//     create(injector: Injector, socket: ClientHttp2Session | null, options: HttpClientOpts): HttpClientTransportSession {
//         const transOpts = options.transportOpts!;
//         return new HttpClientTransportSession(injector, socket,
//             injector.get(StreamAdapter),
//             injector.get(transOpts.encodingsFactory ?? EncodingsFactory).create(injector, transOpts.encodings!),
//             injector.get(transOpts.decodingsFactory ?? DecodingsFactory).create(injector, transOpts.decodings!),
//             options);
//     }

// }

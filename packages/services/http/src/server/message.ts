import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { Decoder, DecodingsFactory, Encoder, EncodingsFactory } from '@tsdi/common/codings';
import { TransportContext, StreamAdapter, TransportOpts, ev, MessageReader, AbstractTransportSession, IReadableStream, IncomingFactory, Incoming, IncomingOpts, MessageWriter, IEventEmitter } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '@tsdi/endpoints';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { Server as HttpsServer } from 'https';
import { Http2Server, ClientHttp2Stream, IncomingHttpHeaders, IncomingHttpStatusHeader } from 'http2';
import { Observable, defer, share, takeUntil } from 'rxjs';
import { HttpContext, HttpServRequest, HttpServResponse } from './context';
import { HttpServerOpts } from './options';
import { MessageFactory, Message, Header } from '@tsdi/common';


// export type ResponseMsg = IncomingMessage | {
//     headers: IncomingHttpHeaders & IncomingHttpStatusHeader,
//     stream: ClientHttp2Stream
// }


export class HttpIncomings<T = any> implements Incoming<T> {
    id: string | number | undefined;
    noHead?: boolean | undefined;
    get headers(): Record<string, Header> {
        return this.req.headers
    }
    public payload: string | Buffer | IReadableStream | null;

    constructor(
        readonly req: HttpServRequest,
        readonly res: HttpServResponse
    ) {
        const len = ~~(req.headers['content-length'] ?? '0');
        if (len) {
            this.payload = req;
        } else {
            this.payload = null;
        }

    }
}

export class HttpIncomingFactory extends IncomingFactory {
    create(options: IncomingOpts): Incoming<any> {
        return new HttpIncomings(options.req!, options.res!)
    }

}

@Injectable()
export class HttpServerMessageReader implements MessageReader<Http2Server | HttpsServer | Server, IEventEmitter, HttpIncomings> {

    read(socket: Http2Server | HttpsServer | Server, channel: null, session: TransportSession): Observable<HttpIncomings> {
        return new Observable<HttpIncomings>(subscribe => {
            const onRequest = (req: HttpServRequest, res: HttpServResponse) => subscribe.next(new HttpIncomings(req, res));
            const onError = (err: any) => err && subscribe.error(err);
            socket.on(ev.CLOSE, onError);
            socket.on(ev.ERROR, onError);
            socket.on(ev.ABOUT, onError);
            socket.on(ev.TIMEOUT, onError);
            socket.on(ev.REQUEST, onRequest);

            return () => {
                socket.off(ev.CLOSE, onError);
                socket.off(ev.ERROR, onError);
                socket.off(ev.ABOUT, onError);
                socket.off(ev.TIMEOUT, onError);
                socket.off(ev.REQUEST, onRequest);
                subscribe.unsubscribe();
            }
        })
    }
}


@Injectable()
export class HttpServerMessagerWriter implements MessageWriter<Http2Server | HttpsServer | Server, HttpServResponse> {
    write(socket: Http2Server | HttpsServer | Server, channel: HttpServResponse, msg: any, origin: any, session: TransportSession): Promise<any> {
       return promisify<any, void>(channel.end, channel)(msg);
    }
}


// export class HttpServerTransportSession extends TransportSession<Http2Server | HttpsServer | Server> {

//     readonly options: TransportOpts
//     constructor(
//         readonly injector: Injector,
//         readonly socket: Http2Server | HttpsServer | Server,
//         readonly streamAdapter: StreamAdapter,
//         readonly encodings: Encoder,
//         readonly decodings: Decoder,
//         readonly serverOptions: HttpServerOpts) {
//         super()
//         this.options = serverOptions.transportOpts ?? {};
//     }


//     sendMessage(msg: any, ctx: HttpContext, context: TransportContext): Observable<any> {
//         return defer(async () => {
//             await this.streamAdapter.sendBody(msg, ctx.response)
//             return msg
//         });
//     }

//     handleMessage(): Observable<HttpIncomings> {
//         return new Observable<HttpIncomings>(subscribe => {
//             const onRequest = (req: HttpServRequest, res: HttpServResponse) => subscribe.next(new HttpIncomings(req, res));
//             const onError = (err: any) => err && subscribe.error(err);
//             this.socket.on(ev.CLOSE, onError);
//             this.socket.on(ev.ERROR, onError);
//             this.socket.on(ev.ABOUT, onError);
//             this.socket.on(ev.TIMEOUT, onError);
//             this.socket.on(ev.REQUEST, onRequest);

//             return () => {
//                 this.socket.off(ev.CLOSE, onError);
//                 this.socket.off(ev.ERROR, onError);
//                 this.socket.off(ev.ABOUT, onError);
//                 this.socket.off(ev.TIMEOUT, onError);
//                 this.socket.off(ev.REQUEST, onRequest);
//                 subscribe.unsubscribe();
//             }
//         }).pipe(
//             share(),
//             takeUntil(this.destroy$)
//         );
//     }

// }

// @Injectable()
// export class HttpServerSessionFactory implements TransportSessionFactory<Http2Server | HttpsServer | Server> {

//     constructor() { }

//     create(injector: Injector, socket: Http2Server | HttpsServer | Server, options: HttpServerOpts): HttpServerTransportSession {
//         const transOpts = options.transportOpts!;
//         return new HttpServerTransportSession(injector, socket,
//             injector.get(StreamAdapter),
//             injector.get(transOpts?.encodingsFactory ?? EncodingsFactory).create(injector, transOpts.encodings!),
//             injector.get(transOpts?.decodingsFactory ?? DecodingsFactory).create(injector, transOpts.decodings!),
//             options);
//     }

// }

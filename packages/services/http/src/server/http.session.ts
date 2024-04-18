import { Injectable, Injector } from '@tsdi/ioc';
import { Decoder, DecodingsFactory, Encoder, EncodingsFactory, StreamAdapter, TransportOpts, ev } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '@tsdi/endpoints';
import { Server, IncomingMessage } from 'http';
import { Server as HttpsServer } from 'https';
import { Http2Server, ClientHttp2Stream, IncomingHttpHeaders, IncomingHttpStatusHeader } from 'http2';
import { Observable, defer, share, takeUntil } from 'rxjs';
import { HttpContext, HttpServRequest, HttpServResponse } from './context';


export type ResponseMsg = IncomingMessage | {
    headers: IncomingHttpHeaders & IncomingHttpStatusHeader,
    stream: ClientHttp2Stream
}


export class HttpIncomings {
    constructor(
        readonly req: HttpServRequest,
        readonly res: HttpServResponse
    ) { }
}

export class HttpServerTransportSession extends TransportSession<Http2Server | HttpsServer | Server> {
    constructor(
        readonly injector: Injector,
        readonly socket: Http2Server | HttpsServer | Server,
        readonly streamAdapter: StreamAdapter,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly options: TransportOpts) {
        super()
    }


    sendMessage(ctx: HttpContext, msg: any): Observable<any> {
        return defer(async () => {
            await this.streamAdapter.sendBody(msg, ctx.response)
            return msg
        });
    }

    handleMessage(): Observable<HttpIncomings> {
        return new Observable<HttpIncomings>(subscribe => {
            const onRequest = (req: HttpServRequest, res: HttpServResponse) => subscribe.next(new HttpIncomings(req, res));
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
            share(),
            takeUntil(this.destroy$)
        );
    }

}

@Injectable()
export class HttpServerSessionFactory implements TransportSessionFactory<Http2Server | HttpsServer | Server> {

    constructor() { }

    create(injector: Injector, socket: Http2Server | HttpsServer | Server, options: TransportOpts): HttpServerTransportSession {
        return new HttpServerTransportSession(injector, socket,
            injector.get(StreamAdapter),

            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options),
            options);
    }

}

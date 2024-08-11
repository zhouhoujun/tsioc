import { hasProps, Injectable, isString, promisify } from '@tsdi/ioc';
import { Header } from '@tsdi/common';
import { ev, MessageReader, IReadableStream, IncomingFactory, Incoming, IncomingOpts, MessageWriter, IEventEmitter, isBuffer } from '@tsdi/common/transport';
import { TransportSession } from '@tsdi/endpoints';
import { Server } from 'http';
import { Server as HttpsServer } from 'https';
import { Http2Server } from 'http2';
import { Observable } from 'rxjs';
import { HttpServRequest, HttpServResponse } from './context';
import { HttpMesage } from '../message';



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
            const onRequest = (req: HttpServRequest, res: HttpServResponse) => subscribe.next(session.incomingFactory.create({ req, res }) as HttpIncomings);
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
    write(socket: Http2Server | HttpsServer | Server, channel: HttpServResponse, msg: HttpMesage, origin: any, session: TransportSession): Promise<any> {
        if (hasProps(msg.headers) && !hasProps(channel.headers ?? channel.getHeaders())) {
            channel.writeHead(channel.statusCode, msg.headers as any);
        }
        if (session.streamAdapter.isStream(msg.data)) {
            return session.streamAdapter.pipeTo(msg.data, channel);
        } else {
            return promisify<any, void>(channel.end, channel)(msg.data);
        }
    }
}


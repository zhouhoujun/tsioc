import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { Packet, RequestPacket, SendPacket, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { Server, ClientRequest } from 'http';
import { Server as HttpsServer } from 'https';
import { Http2Server, ClientHttp2Stream } from 'http2';
import { Observable, first, fromEvent, merge } from 'rxjs';
import { HttpServRequest, HttpServResponse } from './server/context';


export interface ResponseMsg {
    req: HttpServRequest,
    res: HttpServResponse
}

export class HttpClientSession extends AbstractTransportSession<ClientRequest | ClientHttp2Stream, ResponseMsg> {

    protected message(): Observable<ResponseMsg> {
        return fromEvent(this.socket, ev.RESPONSE, (req, res) => ({ req, res }))
    }

    protected mergeClose(source: Observable<any>): Observable<any> {
        const $close = fromEvent(this.socket, ev.CLOSE).pipe((err) => { throw err });
        const $error = fromEvent(this.socket, ev.ERROR);
        const $about = fromEvent(this.socket, ev.ABOUT);
        const $timout = fromEvent(this.socket, ev.TIMEOUT);

        return merge(source, $close, $error, $about, $timout).pipe(first());

    }

    protected write(data: Buffer, packet: Packet<any>): Promise<void> {
        return promisify<Buffer, void>(this.socket.write, this.socket)(data);
    }

    protected async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        (packet as SendPacket).__sent = true;
        (packet as SendPacket).__headMsg = true;
    }

    async destroy(): Promise<void> {

    }
}

@Injectable()
export class HttpClientSessionFactory implements TransportSessionFactory<ClientRequest | ClientHttp2Stream> {

    constructor(readonly injector: Injector, private factory: TransportFactory) { }

    create(socket: ClientRequest | ClientHttp2Stream, options: TransportOpts): HttpClientSession {
        return new HttpClientSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), options);
    }

}


export interface RequestMsg {
    req: HttpServRequest,
    res: HttpServResponse
}


export class HttpServerSession extends AbstractTransportSession<Http2Server | HttpsServer | Server, RequestMsg> {
    destroy(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected message(): Observable<RequestMsg> {
        return fromEvent(this.socket, ev.REQUEST, (req, res)=> ({req, res}))
    }
    protected mergeClose(source: Observable<any>): Observable<any> {
        const $close = fromEvent(this.socket, ev.CLOSE).pipe((err) => { throw err });
        const $error = fromEvent(this.socket, ev.ERROR);
        const $about = fromEvent(this.socket, ev.ABOUT);
        const $timout = fromEvent(this.socket, ev.TIMEOUT);

        return merge(source, $close, $error, $about, $timout).pipe(first());
    }

    protected write(data: Buffer, packet: Packet<any>): Promise<void> {
        
    }
    
    protected beforeRequest(packet: RequestPacket<any>): Promise<void> {
        throw new Error('Method not implemented.');
    }

}

@Injectable()
export class HttpServerSessionFactory implements TransportSessionFactory<Http2Server | HttpsServer | Server> {

    constructor(readonly injector: Injector, private factory: TransportFactory) { }

    create(socket: Http2Server | HttpsServer | Server, options: TransportOpts): HttpServerSession {
        return new HttpServerSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), options);
    }

}

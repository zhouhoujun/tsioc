import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { Decoder, Encoder, HeaderPacket, Packet, RequestPacket, SendPacket, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession, PayloadTransportSession } from '@tsdi/endpoints';
import { Server, ClientRequest } from 'http';
import { Server as HttpsServer } from 'https';
import { Http2Server, ClientHttp2Stream } from 'http2';
import { Observable, first, fromEvent, merge } from 'rxjs';
import { HttpServRequest, HttpServResponse } from './server/context';


export interface ResponseMsg {
    req: HttpServRequest,
    res: HttpServResponse
}

export class HttpClientSession extends PayloadTransportSession<ClientRequest | ClientHttp2Stream, ResponseMsg> {
    
    protected beforeRequest(packet: RequestPacket<any>): Promise<void> {
        throw new Error('Method not implemented.');
    }
    

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

    protected getHeaders(msg: ResponseMsg): HeaderPacket | undefined {
        return msg.req
    }
    protected concat(msg: ResponseMsg): Observable<Buffer> {
        throw new Error('Method not implemented.');
    }
    protected getPacketId(): string | number {
        throw new Error('Method not implemented.');
    }



    async destroy(): Promise<void> {

    }
}

@Injectable()
export class HttpClientSessionFactory implements TransportSessionFactory<ClientRequest | ClientHttp2Stream> {

    constructor(
        readonly injector: Injector,
        private encoder: Encoder,
        private decoder: Decoder) {

    }

    create(socket: ClientRequest | ClientHttp2Stream, options: TransportOpts): HttpClientSession {
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

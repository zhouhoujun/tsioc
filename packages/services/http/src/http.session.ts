import { Packet, RequestPacket, TransportFactory, TransportOpts, TransportSessionFactory } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { Server, ClientRequest } from 'http';
import { Server as HttpsServer } from 'https';
import { Http2Server, ClientHttp2Stream } from 'http2';
import { Observable } from 'rxjs';
import { Injectable, Injector } from '@tsdi/ioc';


export class HttpClientSession extends AbstractTransportSession<ClientRequest | ClientHttp2Stream> {
    destroy(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected message(): Observable<string | Buffer | Uint8Array> {
        throw new Error('Method not implemented.');
    }
    protected mergeClose(source: Observable<any>): Observable<any> {
        throw new Error('Method not implemented.');
    }
    protected write(data: Buffer, packet: Packet<any>): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected beforeRequest(packet: RequestPacket<any>): Promise<void> {
        throw new Error('Method not implemented.');
    }

}

@Injectable()
export class HttpClientSessionFactory implements TransportSessionFactory<ClientRequest | ClientHttp2Stream> {

    constructor(readonly injector: Injector, private factory: TransportFactory) { }

    create(socket: ClientRequest | ClientHttp2Stream, options: TransportOpts): HttpClientSession {
        return new HttpClientSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), options);
    }

}



export class HttpServerSession extends AbstractTransportSession<Http2Server | HttpsServer | Server> {
    destroy(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected message(): Observable<string | Buffer | Uint8Array> {
        throw new Error('Method not implemented.');
    }
    protected mergeClose(source: Observable<any>): Observable<any> {
        throw new Error('Method not implemented.');
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

    constructor(readonly injector: Injector, private factory: TransportFactory) { }

    create(socket: Http2Server | HttpsServer | Server, options: TransportOpts): HttpServerSession {
        return new HttpServerSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), options);
    }

}

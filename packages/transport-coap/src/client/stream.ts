import { Injectable, Injector, lang } from '@tsdi/ioc';
import { ClientRequsetOpts, ClientSession, ClientSessionBuilder, ClientStream, ev } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { OutgoingHeaders, PacketIdGenerator } from '@tsdi/core';


@Injectable()
export class CoapClientSessioBuilder implements ClientSessionBuilder {


    constructor(private injector: Injector) {

    }

    build(connectOpts: SocketOptions): Observable<ClientSession> {
        const getor = this.injector.get(PacketIdGenerator);
        return new Observable((observer: Observer<ClientSession>) => {
            const socket = createSocket(connectOpts);
            const authority = '';
            const client = new CoapClientSession(authority, socket, getor);
            const onError = (err: Error) => {
                observer.error(err);
            }
            const onClose = () => {
                client.end();
            };
            const onConnected = () => {
                observer.next(client);
            }
            client.on(ev.ERROR, onError);
            socket.on(ev.CLOSE, onClose);
            socket.on(ev.END, onClose);
            client.on(ev.CONNECT, onConnected);

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CLOSE, onClose);
                client.off(ev.END, onClose);
                client.off(ev.CONNECT, onConnected);
            }
        });
    }

}

export class UdpCoapClientStream extends ClientStream {

    constructor(readonly id: string) {
        super();
    }

    close(code?: number | undefined, callback?: (() => void) | undefined): void {
        this.emit(ev.CLOSE, code);
        this.end(callback);
    }
}

export class CoapClientSession extends ClientSession {

    private _clientId: string;
    private _closed: boolean;
    private smaps: Map<string, ClientStream>;

    constructor(readonly authority: string, readonly socket: Socket, readonly idGentor: PacketIdGenerator) {
        super()
        this._closed = false;
        this._clientId = `coap_${idGentor.generate()}`
        this.smaps = new Map();
    }



    get clientId(): string {
        return this._clientId;
    }

    get closed(): boolean {
        return this._closed;
    }


    request(headers: OutgoingHeaders, options?: ClientRequsetOpts | undefined): ClientStream {
        const id = this.idGentor.generate();
        const stream = new UdpCoapClientStream(id); 
        this.smaps.set(id, stream);
        return stream;
    }

    close(): Promise<void> {
        const defer = lang.defer<void>();
        this.socket.close(defer.resolve);
        return defer.promise.then(() => {
            this._closed = true;
        });
    }
}
import { TransportRequest, ClientContext, Packet } from '@tsdi/core';
import { Injectable, lang } from '@tsdi/ioc';
import { Connection, ev, hdr, IncomingMessage, OutgoingMessage, RequestStream, sendbody, TransportBackend } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';


@Injectable()
export class TcpBackend extends TransportBackend {

    protected createRequest(conn: Connection<tls.TLSSocket | net.Socket>, req: TransportRequest<any>): OutgoingMessage {
        const url = `${req.url.trim()}?${req.params.toString()}`;
        req.headers
            .set(hdr.PATH, url)
            .set(hdr.METHOD, req.method);
        const headers = req.headers.headers;
        const id = this.getAttachId();

        const request = new RequestStream(id, conn, headers);
        return request;
    }

    private id = Math.max(1, Math.floor(Math.random() * 65535));
    protected getAttachId() {
        const id = this.id++;
        if (this.id === 65536) {
            this.id = 1
        }
        return id;
    }

    protected override sendBody(request: OutgoingMessage, body: any, callback: (error?: Error | null) => void): void {
        request.write({ id: request.id, body: body }, callback);
    }

    // protected send(conn: Connection, req: TransportRequest<any>, ctx: ClientContext): Observable<IncomingMessage> {

    //     const url = `${req.url.trim()}?${req.params.toString()}`;
    //     req.headers
    //         .set(hdr.PATH, url)
    //         .set(hdr.METHOD, req.method);
    //     const headers = req.headers.headers;
    //     const id = this.getAttachId();

    //     return new Observable((observer: Observer<IncomingMessage>) => {
    //         let incoming: IncomingMessage;
    //         const onData = (packet: Packet) => {
    //             // if (packet.id === id) {

    //             // }
    //         }
    //         conn.on(ev.DATA, onData);

    //         conn.write({
    //             id,
    //             headers
    //         });

    //         const body = req.body;
    //         if (body !== null) {
    //             conn.write({
    //                 id,
    //                 body
    //             })
    //         }
    //         return () => {
    //             conn.off(ev.DATA, onData);
    //         }
    //     });
    // }

    // protected async send(conn: Connection, req: TransportRequest<any>, ctx: ClientContext, onError: (err: any) => void): Promise<void> {
    //     const url = `${req.url.trim()}?${req.params.toString()}`;
    //     req.headers
    //         .set(hdr.PATH, url)
    //         .set(hdr.METHOD, req.method);
    //     const headers = req.headers.headers;
    //     const id  = this.getAttachId();

    //     conn.write({
    //         id,
    //         headers,
    //         body: req.body
    //     }, onError);

    //     // if (req.body) {
    //     //     conn.write({
    //     //         id,
    //     //         body: req.body
    //     //     })
    //     //     sendbody(req.body, conn, onError)
    //     // }

    // }

}

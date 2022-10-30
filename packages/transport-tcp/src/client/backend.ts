import { TransportRequest, ClientContext } from '@tsdi/core';
import { Injectable, lang } from '@tsdi/ioc';
import { Connection, ev, hdr, sendbody, TransportBackend } from '@tsdi/transport';



@Injectable()
export class TcpBackend extends TransportBackend {

    protected async send(conn: Connection, req: TransportRequest<any>, ctx: ClientContext, onError: (err: any) => void): Promise<void> {
        const url = `${req.url.trim()}?${req.params.toString()}`;
        req.headers
            .set(hdr.PATH, url)
            .set(hdr.METHOD, req.method);
        const headers = req.headers.headers;
        const id = req.id = this.getAttachId();

        conn.write({
            id,
            headers,
            body: req.body
        }, onError);

        // if (req.body) {
        //     conn.write({
        //         id,
        //         body: req.body
        //     })
        //     sendbody(req.body, conn, onError)
        // }

    }

    private id = Math.max(1, Math.floor(Math.random() * 65535));
    protected getAttachId() {
        const id = this.id++;
        if (this.id === 65536) {
            this.id = 1
        }
        return id;
    }

}

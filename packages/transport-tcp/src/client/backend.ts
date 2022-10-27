import { TransportRequest, ClientContext } from '@tsdi/core';
import { Injectable, lang } from '@tsdi/ioc';
import { Connection, ev, hdr, sendbody, TransportBackend } from '@tsdi/transport';



@Injectable()
export class TcpBackend extends TransportBackend {

    protected async send(conn: Connection, req: TransportRequest<any>, ctx: ClientContext, onError: (err: any) => void): Promise<void> {
        const url = `${req.url.trim()}?${req.params.toString()}`;
        const headers = req.headers.set(hdr.METHOD, req.method).headers


        conn.write({
            url,
            headers
        });

        if (req.body) {
            sendbody(req.body, conn, onError)
        }

    }

}

import { Injectable } from '@tsdi/ioc';
import { Connection, ev, TransportBackend } from '@tsdi/transport';
import { TransportRequest, ClientContext, Incoming, TransportEvent } from '@tsdi/core';
import { Observable, Observer } from 'rxjs';


@Injectable()
export class TcpBackend extends TransportBackend {

    protected send(conn: Connection, req: TransportRequest<any>, ctx: ClientContext): Observable<Incoming<any>> {
        return new Observable((observer: Observer<TransportEvent<any>>) => {

            const onResponse = (incoming: Incoming) => {

            };

            conn.on(ev.RESPONSE, onResponse);
            conn.write(req.body)

            return () => {
                conn.off(ev.RESPONSE, onResponse);
                if (!ctx.destroyed) {
                    observer.error(new HttpErrorResponse({
                        status: 0,
                        statusText: 'The operation was aborted.'
                    }));

                }

            });
    }
}

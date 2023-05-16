import { Handler, Interceptor, ListenOpts, TransportEvent, TransportRequest } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Tcp path interceptor.
 */
@Injectable()
export class TcpPathInterceptor implements Interceptor<TransportRequest, TransportEvent> {

    constructor(private listenOpts: ListenOpts) { }

    intercept(req: TransportRequest<any>, next: Handler<TransportRequest<any>, TransportEvent>): Observable<TransportEvent> {
        let url = req.url.trim();
        if (!tcptl.test(url)) {
            const { host, port, path } = this.listenOpts;
            const isIPC = !host && !port;
            const protocol = req.withCredentials ? 'ssl' : 'tcp';
            const urlPrefix = isIPC ? new URL(`${protocol}://${host ?? 'localhost'}`) : `${protocol}://${host ?? 'localhost'}:${port ?? 3000}`;
            const baseUrl = new URL(urlPrefix, path);
            const uri = new URL(url, baseUrl);
            if (isIPC) {
                uri.protocol = 'ipc';
            }
            url = uri.toString();
            req.url = url;
        }
        return next.handle(req);
    }

}

const tcptl = /^(tcp|ipc):\/\//i;

import { Handler, Interceptor, ListenOpts, TransportEvent, TransportRequest } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Redis path interceptor.
 */
@Injectable()
export class RedisPathInterceptor implements Interceptor<TransportRequest, TransportEvent> {

    constructor(private listenOpts: ListenOpts) { }

    intercept(req: TransportRequest, next: Handler<TransportRequest, TransportEvent>): Observable<TransportEvent> {
        let url = req.url.trim();
        if (!urlExp.test(url)) {
            const { host, port, path } = this.listenOpts;
            const protocol = 'redis';
            const urlPrefix =  `${protocol}://${host ?? 'localhost'}:${port ?? 6379}`;

            const baseUrl = new URL(urlPrefix, path);
            const uri = new URL(url, baseUrl);
            url = uri.toString();
            req.url = url;
        }
        return next.handle(req);
    }

}

const urlExp = /^redis:\/\//i;

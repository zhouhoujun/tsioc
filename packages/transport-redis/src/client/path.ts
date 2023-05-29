import { Handler, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';

/**
 * Redis path interceptor.
 */
@Injectable()
export class RedisPathInterceptor implements Interceptor<TransportRequest, TransportEvent> {

    constructor(@Inject(REDIS_CLIENT_OPTS) private clientOpts: RedisClientOpts) { }

    intercept(req: TransportRequest, next: Handler<TransportRequest, TransportEvent>): Observable<TransportEvent> {
        let url = req.url.trim();
        if (!urlExp.test(url)) {
            const { host, port } = this.clientOpts.connectOpts?.tls ?? {};
            const protocol = 'redis';
            const baseUrl =  `${protocol}://${host ?? 'localhost'}:${port ?? 6379}`;

            const uri = new URL(url, baseUrl);
            url = uri.toString();
            req.url = url;
        }
        return next.handle(req);
    }

}

const urlExp = /^redis:\/\//i;

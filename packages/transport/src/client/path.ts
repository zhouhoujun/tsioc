import { Injectable } from '@tsdi/ioc';
import { Endpoint, EndpointContext, Interceptor, ListenOpts, TransportArgumentExecption } from '@tsdi/core';
import { Observable } from 'rxjs';
import { TransportRequest } from './request';
import { TransportEvent } from './response';


@Injectable({ static: true })
export class NormlizePathInterceptor implements Interceptor<TransportRequest, TransportEvent> {

    constructor() { }

    intercept(req: TransportRequest, next: Endpoint<TransportRequest, TransportEvent>, context: EndpointContext): Observable<TransportEvent> {
        const url = req.url.trim();
        const protocol = context.transport;
        if (!protocol) throw new TransportArgumentExecption('no protocol provider.');
        if (!protocol.isAbsoluteUrl(url)) {
            req.url = protocol.normlizeUrl(req.url, context.get(ListenOpts));
        }
        return next.handle(req, context);
    }
}

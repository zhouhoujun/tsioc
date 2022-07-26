import { Injectable } from '@tsdi/ioc';
import { Endpoint, EndpointContext, Interceptor, Protocol, TransportArgumentError } from '@tsdi/core';
import { Observable } from 'rxjs';
import { TransportRequest } from './request';
import { TransportEvent } from './response';


@Injectable()
export class NormlizePathInterceptor implements Interceptor<TransportRequest, TransportEvent> {

    constructor() { }

    intercept(req: TransportRequest, next: Endpoint<TransportRequest, TransportEvent>, context: EndpointContext): Observable<TransportEvent> {
        const url = req.url.trim();
        const protocol = context.get(Protocol);
        if (!protocol) throw new TransportArgumentError('no protocol provider.');
        if (!protocol.isAbsoluteUrl(url)) {
            req.url = protocol.normlizeUrl(req.url);
        }
        return next.handle(req, context);
    }
}
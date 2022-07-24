import { Injectable } from '@tsdi/ioc';
import { Endpoint, EndpointContext, Interceptor, TransportArgumentError } from '@tsdi/core';
import { Observable } from 'rxjs';
import { TransportRequest } from './request';
import { TransportEvent } from './response';
import { TransportProtocol } from '../protocol';


@Injectable()
export class NormlizePathInterceptor implements Interceptor<TransportRequest, TransportEvent> {

    constructor(private protocol: TransportProtocol) { }

    intercept(req: TransportRequest, next: Endpoint<TransportRequest, TransportEvent>, context: EndpointContext): Observable<TransportEvent> {
        const url = req.url.trim();
        if (!this.protocol.isAbsoluteUrl(url)) {
            if (!this.protocol) throw new TransportArgumentError('no protocol provider.');
            req.url = this.protocol.normlizeUrl(req.url);
        }
        return next.handle(req, context);
    }
}

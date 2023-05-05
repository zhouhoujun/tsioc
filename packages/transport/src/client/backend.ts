import { Backend, TransportEvent, TransportRequest } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { RequestAdapter } from './request';
import { StreamRequestAdapter } from './request.stream';

/**
 * transport client endpoint backend.
 */
@Injectable()
export class TransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> implements Backend<TRequest, TResponse>  {

    constructor(private reqAdapter: RequestAdapter<TRequest, TResponse, TStatus>) { }

    handle(req: TRequest): Observable<TResponse> {
        return this.reqAdapter.send(req)
    }

}


/**
 * stream transport client endpoint backend.
 */
@Injectable()
export class StreamTransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> implements Backend<TRequest, TResponse>  {

    constructor(private reqAdapter: StreamRequestAdapter<TRequest, TResponse, TStatus>) { }

    handle(req: TRequest): Observable<TResponse> {
        return this.reqAdapter.send(req)
    }

}

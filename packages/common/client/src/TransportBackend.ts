import { Backend } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';
import { Requester } from './Requester';

/**
 * transport client endpoint backend.
 */
@Injectable()
export class TransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent> implements Backend<TRequest, TResponse>  {

    handle(req: TRequest): Observable<TResponse> {
        const requester = req.context.get(Requester);
        return requester.request(req);
    }

}


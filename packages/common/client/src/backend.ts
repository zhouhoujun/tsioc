import { Backend } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';

/**
 * transport client endpoint backend.
 */
@Abstract()
export abstract class TransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent> implements Backend<TRequest, TResponse>  {

    abstract handle(req: TRequest): Observable<TResponse>;

}


import { Abstract } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { Receiver, Sender, TransportEvent, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';

/**
 * transport client endpoint backend.
 */
@Abstract()
export abstract class TransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent> implements Backend<TRequest, TResponse>  {

    /**
     * packet sender
     */
    abstract get sender(): Sender;

    /**
     * packet receiver.
     */
    abstract get receiver(): Receiver;
    
    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: TRequest): Observable<TResponse>;
}


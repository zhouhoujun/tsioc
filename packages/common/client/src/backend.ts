import { Abstract } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';
import { Observable } from 'rxjs';


/**
 * transport client endpoint backend.
 */
@Abstract()
export abstract class TransportBackend implements Backend<TransportRequest, TransportEvent>  {

    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: TransportRequest): Observable<TransportEvent>;

}

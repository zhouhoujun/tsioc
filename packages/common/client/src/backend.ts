import { Abstract } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { RequestPacket, TransportEvent } from '@tsdi/common';
import { Observable } from 'rxjs';


/**
 * transport client endpoint backend.
 */
@Abstract()
export abstract class TransportBackend implements Backend<RequestPacket, TransportEvent>  {

    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: RequestPacket): Observable<TransportEvent>;

}

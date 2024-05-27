import { Abstract } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { AbstractRequest, ResponseEvent } from '@tsdi/common';
import { Observable } from 'rxjs';


/**
 * transport client endpoint backend.
 */
@Abstract()
export abstract class TransportBackend implements Backend<AbstractRequest, ResponseEvent>  {

    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: AbstractRequest): Observable<ResponseEvent>;

}

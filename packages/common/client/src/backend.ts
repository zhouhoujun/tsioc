import { Abstract } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { AbstractRequest, ResponseEvent } from '@tsdi/common';
import { Observable } from 'rxjs';


/**
 * client backend.
 */
@Abstract()
export abstract class ClientBackend implements Backend<AbstractRequest<any>, ResponseEvent<any>>  {

    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: AbstractRequest<any>): Observable<ResponseEvent<any>>;

}

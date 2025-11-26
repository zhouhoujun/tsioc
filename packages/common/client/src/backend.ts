import { Abstract } from '@tsdi/ioc';
import { RequestHandler, AbstractRequest, ResponseEvent, RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';


/**
 * client backend.
 */
@Abstract()
export abstract class RequestBackend implements RequestHandler<AbstractRequest<any>, ResponseEvent<any>>  {

    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: AbstractRequest<any>, context: RequestContext): Observable<ResponseEvent<any>>;

}

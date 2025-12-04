import { Abstract } from '@tsdi/ioc';
import { RequestHandler, AbstractRequest, ResponseEvent, RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';



/**
 * client requst Hanlder.
 */
@Abstract()
export abstract class ClientHandler<TReq extends AbstractRequest<any> = AbstractRequest<any>, TRes extends ResponseEvent<any> = ResponseEvent<any>> implements RequestHandler<TReq, TRes> {

    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: TReq, context: RequestContext): Observable<TRes>;

}

/**
 * client backend.
 */
@Abstract()
export abstract class ClientBackend<TReq extends AbstractRequest<any> = AbstractRequest<any>, TRes extends ResponseEvent<any> = ResponseEvent<any>> implements RequestHandler<TReq, TRes> {

    /**
     * handle client request
     * @param req 
     */
    abstract handle(req: TReq, context: RequestContext): Observable<TRes>;

}

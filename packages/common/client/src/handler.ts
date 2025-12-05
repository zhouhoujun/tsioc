import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { RequestHandler, AbstractRequest, ResponseEvent, RequestContext, ConfigableRequestHandler } from '@tsdi/common';
import { Observable } from 'rxjs';



/**
 * client requst Hanlder.
 */
@Abstract()
export abstract class ClientHandler<
    TReq extends AbstractRequest<any> = AbstractRequest<any>,
    TRes extends ResponseEvent<any> = ResponseEvent<any>>
    extends ConfigableHandler<TReq, TRes, RequestContext> implements ConfigableRequestHandler<TReq, TRes, RequestContext> {

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

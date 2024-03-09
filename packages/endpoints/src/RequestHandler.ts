import { Abstract } from '@tsdi/ioc';
import { Handler, HandlerContext } from '@tsdi/core';
import { Observable } from 'rxjs';


/**
 * Request context.
 */
export interface RequestContext<TReq = any, TRes = any> extends HandlerContext<TReq> {
    req: TReq;
    res: TRes;
}

/**
 * Request handler, the fundamental building block of servers.
 */
@Abstract()
export abstract class RequestHandler<TContext extends RequestContext = RequestContext> implements Handler<TContext, any> {
    /**
     * Request handle.
     * @param input 
     */
    abstract handle(input: TContext): Observable<any>;
}

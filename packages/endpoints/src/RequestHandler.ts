import { Abstract } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { RequestContext } from './RequestContext';


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

    /**
     * is this equals to target or not
     * @param target 
     */
    abstract equals?(target: any): boolean;

    /**
     * destroy hooks.
     */
    abstract onDestroy?(): void;
}

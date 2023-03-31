import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Handler } from '../Handler';

/**
 * Endpoint is the fundamental building block of servers and clients.
 */
@Abstract()
export abstract class Endpoint<TCtx extends InvocationContext = InvocationContext, TOutput = any> implements Handler<TCtx, TOutput> {
    /**
     * transport endpoint handle.
     * @param context request context.
     */
    abstract handle(context: TCtx): Observable<TOutput>;

    /**
     * is this equals to target or not
     * @param target 
     */
    abstract equals?(target: any): boolean;
}

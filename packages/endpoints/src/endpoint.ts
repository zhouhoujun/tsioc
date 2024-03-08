import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Handler } from '@tsdi/core';

/**
 * Endpoint is the fundamental building block of servers.
 * 
 * 终结点是服务端的基本构建块。
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

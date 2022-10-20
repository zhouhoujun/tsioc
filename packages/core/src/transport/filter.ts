import { Abstract, chain, Handler, OperationInvoker, Type } from '@tsdi/ioc';
import { Filter } from '../filter';
import { ServerEndpointContext } from './context';
import { NEXT } from './middleware';
import { Status } from './status';

@Abstract()
export abstract class Respond {

    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: ServerEndpointContext, value: T): void;
}

/**
 * Execption respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: ServerEndpointContext, responseType: 'body' | 'header' | 'response', value: T): void;
}

/**
 * respond filter.
 */
@Abstract()
export abstract class RespondFilter extends Filter {
    /**
     * handle execption.
     * @param ctx invocation context with execption error.
     * @param next invoke next filter in chain.
     */
    abstract handle(ctx: ServerEndpointContext, next: () => Promise<void>): Promise<any>;
}


/**
 * Respond chain.
 */
 export class RespondChain implements RespondFilter {

    private _chain?: Handler<ServerEndpointContext>;
    constructor(private filters: RespondFilter[]) {

    }

    handle(ctx: ServerEndpointContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.sent) return next ? next() : NEXT();
        if (!this._chain) {
            const fns = this.filters.map(f => (c: ServerEndpointContext, n: () => Promise<void>) => f.handle(c, n));
            this._chain = chain(fns)
        }
        return this._chain(ctx, next ?? NEXT)
    }
}



/**
 * respond handler method resolver.
 */
@Abstract()
export abstract class RespondHandlerMethodResolver {
    /**
     * resolve execption hanlde.
     * @param status 
     */
    abstract resolve(status: Type<Status> | Status): OperationInvoker[];
    /**
     * add execption handle.
     * @param status execption type
     * @param methodInvoker execption handle invoker.
     * @param order order.
     */
    abstract addHandle(status: Type<Status>, methodInvoker: OperationInvoker, order?: number): this;
    /**
     * remove execption handle.
     * @param status execption type.
     * @param methodInvoker execption handle.
     */
    abstract removeHandle(status: Type<Status>, methodInvoker: OperationInvoker): this;
}

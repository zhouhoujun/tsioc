import { Abstract, InvocationContext, Interceptor, Parameter, Handler } from '@tsdi/ioc';

/**
 * transaction resolvers.
 */
@Abstract()
export abstract class TransactionResolver implements Interceptor<Parameter, InvocationContext> {

    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx instanceof InvocationContext
     */
    abstract intercept(parameter: Parameter,  next: Handler<Parameter, InvocationContext>, ctx: InvocationContext): any;
}

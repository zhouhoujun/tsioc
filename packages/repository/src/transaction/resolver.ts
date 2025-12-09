import { Abstract, Interceptor, Parameter, Handler, ResolveContext } from '@tsdi/ioc';

/**
 * transaction resolvers.
 */
@Abstract()
export abstract class TransactionResolver<TOutput = any> implements Interceptor<Parameter, TOutput, ResolveContext> {

    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx instanceof InvocationContext
     */
    abstract intercept(parameter: Parameter,  next: Handler<Parameter, TOutput, ResolveContext>, ctx: ResolveContext): TOutput;
}

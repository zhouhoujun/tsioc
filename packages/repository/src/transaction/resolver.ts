import { Abstract, Interceptor, Parameter, Handler, RunContext } from '@tsdi/ioc';

/**
 * transaction resolvers.
 */
@Abstract()
export abstract class TransactionResolver<TOutput = any> implements Interceptor<Parameter, TOutput, RunContext> {

    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx instanceof InvocationContext
     */
    abstract intercept(parameter: Parameter,  next: Handler<Parameter, TOutput, RunContext>, ctx: RunContext): TOutput;
}

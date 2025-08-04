import { Abstract, InvocationContext, OperationArgumentResolver, Parameter } from '@tsdi/ioc';

/**
 * transaction resolvers.
 */
@Abstract()
export abstract class TransactionResolver implements OperationArgumentResolver<Parameter, InvocationContext> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx instanceof InvocationContext
     */
    abstract canResolve(parameter: Parameter, ctx: InvocationContext): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx instanceof InvocationContext
     */
    abstract resolve<T>(parameter: Parameter, ctx: InvocationContext): T | null;
}

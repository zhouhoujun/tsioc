import { Abstract, InvocationContext, OperationArgumentResolver, Parameter } from '@tsdi/ioc';

/**
 * transaction resolvers.
 */
@Abstract()
export abstract class TransactionResolver<TParameter extends Parameter = Parameter, TCtx extends InvocationContext = InvocationContext> implements OperationArgumentResolver<TParameter, TCtx> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx instanceof InvocationContext
     */
    abstract canResolve(parameter: TParameter, ctx: TCtx): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx instanceof InvocationContext
     */
    abstract resolve<T>(parameter: TParameter, ctx: TCtx): T | null;
}

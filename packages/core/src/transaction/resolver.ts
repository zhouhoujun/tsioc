import { Abstract, InvocationContext, OperationArgumentResolver, Parameter } from '@tsdi/ioc';

/**
 * transaction resolvers.
 */
@Abstract()
export abstract class TransactionResolver<C = any> implements OperationArgumentResolver<C> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param args gave arguments
     */
    abstract canResolve(parameter: Parameter<any>, ctx: InvocationContext<C>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    abstract resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<any>): T;
}
